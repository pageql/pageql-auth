const { parse } = require('svelte/compiler');
const parse5 = require('parse5');

function walkAst(doc, action) {
    action(doc);
    if (!doc.childNodes) return;
    for (let i = 0; i < doc.childNodes.length; i++) {
        walkAst(doc.childNodes[i], action);
    }
}

function findVerbatimElements(htmlx) {
    const elements = [];
    const tagNames = ['script', 'style'];

    const parseOpts = { sourceCodeLocationInfo: true };
    const doc = parse5.parseFragment(htmlx, parseOpts);

    const checkCase = (content, el) => {
        const orgStart = el.sourceCodeLocation.startOffset || 0;
        const orgEnd = el.sourceCodeLocation.endOffset || 0;
        const outerHtml = htmlx.substring(orgStart, orgEnd);
        const onlyTag = content ? outerHtml.replace(content.value, '') : outerHtml;

        return tagNames.some((tag) => !!onlyTag.match(tag));
    };

    walkAst(doc, (el) => {
        const parseValue = (attr) => {
            const sourceCodeLocation = el.sourceCodeLocation.attrs[attr.name];
            const { startOffset, endOffset } = sourceCodeLocation;
            const beforeAttrEnd = htmlx.substring(0, endOffset);
            const valueStartIndex = beforeAttrEnd.indexOf('=', startOffset);
            const isBare = valueStartIndex === -1;

            return {
                type: 'Attribute',
                name: attr.name,
                value: isBare || [
                    {
                        type: 'Text',
                        start: valueStartIndex + 1,
                        end: endOffset,
                        raw: attr.value,
                    },
                ],
                start: startOffset,
                end: endOffset,
            };
        };

        if (tagNames.includes(el.nodeName)) {
            const hasNodes = el.childNodes && el.childNodes.length > 0;
            const content = hasNodes ? (el.childNodes[0]) : null;
            if (!checkCase(content, el)) {
                return;
            }

            elements.push({
                start: el.sourceCodeLocation.startOffset,
                end: el.sourceCodeLocation.endOffset,
                type: el.nodeName[0].toUpperCase() + el.nodeName.substr(1),
                attributes: !el.attrs ? [] : el.attrs.map((a) => parseValue(a)),
                content:
                    content === null
                        ? {
                              type: 'Text',
                              start: el.sourceCodeLocation.startTag.endCol,
                              end: el.sourceCodeLocation.endTag.startCol,
                              value: '',
                              raw: '',
                          }
                        : {
                              type: 'Text',
                              start: content.sourceCodeLocation.startOffset,
                              end: content.sourceCodeLocation.endOffset,
                              value: content.value,
                              raw: content.value,
                          },
            });
        }
    });

    return elements;
}

function blankVerbatimContent(htmlx, verbatimElements) {
    let output = htmlx;
    for (const node of verbatimElements) {
        const content = node.content;
        if (content) {
            output =
                output.substring(0, content.start) +
                output.substring(content.start, content.end).replace(/[^\n]/g, ' ') +
                output.substring(content.end);
        }
    }
    return output;
}

module.exports.parseHtmlx = (htmlx) => {
    //Svelte tries to parse style and script tags which doesn't play well with typescript, so we blank them out.
    //HTMLx spec says they should just be retained after processing as is, so this is fine
    const verbatimElements = findVerbatimElements(htmlx);
    const deconstructed = blankVerbatimContent(htmlx, verbatimElements);

    //extract the html content parsed as htmlx this excludes our script and style tags
    const svelteHtmlxAst = parse(deconstructed).html;

    //restore our script and style tags as nodes to maintain validity with HTMLx
    for (const s of verbatimElements) {
        svelteHtmlxAst.children.push(s);
        svelteHtmlxAst.start = Math.min(svelteHtmlxAst.start, s.start);
        svelteHtmlxAst.end = Math.max(svelteHtmlxAst.end, s.end);
    }
    return svelteHtmlxAst;
}