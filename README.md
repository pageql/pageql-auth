# [PageQL Auth](https://pageql.dev) &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/pageql/pageql-auth/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/@pageql/pageql-auth.svg?style=flat)](https://www.npmjs.com/package/@pageql/pageql-auth) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://reactjs.org/docs/how-to-contribute.html#your-first-pull-request)
PageQL Authentiction and Authorization helpers for Svelte

Get started by installing to an existing Svelte project
`npm install -D @pageql/pageql-auth`

Adding PageQL to your rollup config
```
import { pageqlAuthPreprocess } from '@pageql/pageql-auth';
...
plugins: [
    svelte({
        ...
        preprocess: [
            pageqlAuthPreprocess(),
        ]
    }),
    ...
]
...
```

Init PageQL on App.svelte (_layout.svelte if you're using Sapper)
```
<script>
  /* PageQL BoilerPlate*/
  import pageqlConfig from "../pageql.config.js";
  import { writable } from "svelte/store";

  window.pageql = {};
  window.pageql.authState = writable({ loggedIn: false });
  window.pageql.auth = pageqlConfig.auth;
  window.pageql.user = {};

  const authState = window.pageql.authState;
  /* PageQL BoilerPlate*/
</script>
...
```

Setup your `pageql.config.js` in your project's root
```
export default {
    auth: {
        checkRole: (requiredRole) => {
            //Used by pageql:authRole directive
            //Return false if user's role fails to hit specifications
            //Returning false hides the component

            return !window.pageql.user.role.includes(requiredRole);
        },
        doLogin: (loginCallback, event) => {
            //Used by pageql:authLogin directive
            //Can get value of "password" input with event.target.password.value

            //Do login logic here

            window.pageql.user = {
                name: event.target.email.value,
                role: [
                    "admin"
                ], //Get from login response
            };

            window.pageql.authState.set({ loggedIn: true });

            loginCallback();
        },
        doLogout: (logoutCallback, event) => {
            //Used by pageql:authLogout directive
            window.pageql.authState.set({ loggedIn: false });

            logoutCallback();
        },
        doRegister: (registerCallback, event) => {
            //Used by pageql:authRegister directive
            //Can get value of "password" input with event.target.password.value

            //Do register logic here

            window.pageql.user = {
                name: event.target.email.value,
                role: [
                    "admin"
                ], //Get from login response
            };

            window.pageql.authState.set({ loggedIn: true });

            registerCallback();
        },
        getUserId: () => {
            //Custom functions like this can be defined and accessed anywhere with window.pageql.auth.getUserId()
            return "my-user-id";
        },
        getTenantId: () => {
            //You can remove this if you're not using multi tenant!
            return "1";
        }
    },
}
```
