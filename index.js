const { parseHtmlx } = require('./htmlxparser');
const { walk } = require('svelte/compiler');
const MagicString = require('magic-string');

module.exports = {
    pageqlAuthPreprocess: {
        markup: (source) => {
            //input
            let out = new MagicString(source.content);
            let src = source.content;

            const processPageQLAttributes = (node) => {
                if (node.type == 'Element') {
                    for (const attribute of (node.attributes || []).filter((a) => a.type == 'Attribute')) {
                        const attributeValue = attribute.value;
                        const prop = attribute.name;
                        const splitProp = prop.split(':');

                        if (splitProp[0] == "pageql") {
                            let overwriter;
                            switch (splitProp[1]) {
                                case "authLogin":
                                    if (node.name == 'form') {
                                        const authLoginVariable = src.substring(attributeValue[0].expression.start, attributeValue[0].expression.end);
                                        overwriter = `on:submit|preventDefault={(event) => window.pageql.auth.doLogin(${authLoginVariable}, event)}`;

                                    }
                                    break;
                                case "authLogout":
                                    const authLogoutVariable = src.substring(attributeValue[0].expression.start, attributeValue[0].expression.end);
                                    overwriter = `on:click={(event) => window.pageql.auth.doLogout(${authLogoutVariable}, event)}`;
                                    break;
                                case "authRegister":
                                    if (node.name == 'form') {
                                        const authRegisterVariable = src.substring(attributeValue[0].expression.start, attributeValue[0].expression.end);
                                        overwriter = `on:submit|preventDefault={(event) => window.pageql.auth.doRegister(${authRegisterVariable}, event)}`;
                                    }
                                    break;
                                case "authRole":
                                    const authRoleVariable = src.substring(attributeValue[0].expression.start, attributeValue[0].expression.end);
                                    overwriter = `class:hidden={window.pageql.auth.checkRole(${authRoleVariable})}`;
                                    break;
                                default:
                                    let error = new Error(`Custom PageQL directive ${splitProp[1]} is invalid`);
                                    throw error;
                            }

                            out.overwrite(
                                attribute.start,
                                attribute.end,
                                overwriter,
                            );
                        }
                    }
                }
            };

            //apply transforms
            try {
                const ast = parseHtmlx(source.content);
                walk(ast, {
                    enter: (node, parent, prop, index) => {
                        processPageQLAttributes(node);
                    }
                })
            } catch (e) {
                //convert svelte CompilerError to string for our loader (rollup/webpack)
                let error = new Error(`${source.file ? `${source.file} :` : ""}${e.toString()}`);
                error.name = `PageQLPreprocessor/${e.name}`
                throw error;
            }

            //output
            const map = out.generateMap({
                source: source.file,
                file: source.file + ".map",
                includeContent: true
            });

            return { code: out.toString(), map: map.toString() };
        },
    },
};