# headless-delphi
Web app to facilitate roundless, headless Delphi-style discussions

### Getting started

You'll first need to install node.js and browserify, then fetch dependencies using `npm install`.

To run locally:

```
make run
```

Then browse to https://localhost:8000/. Right now that URL doesn't do anything but in the future it could be a landing page (see adding discussions below).

In order to do much of anything, you'll need to set up at least one moderator, and use that moderator to set up at least one discussion.

### Adding a moderator

To recognize moderators, we use secrets stored in an Azure Key Vault. To set up a vault, see https://docs.microsoft.com/en-us/azure/key-vault/secrets/quick-create-node. Put the vault name in the environment variable `KEY_VAULT_NAME` before starting the server: e.g.,

```
export KEY_VAULT_NAME=[name]
make run
```

Once the vault is available, we want to add one secret per moderator. Name the secret `moderator-[handle]`, where `[handle]` is the handle that the moderator will use to log in. (All moderators must have separate handles.)

Now when we load the app, we can check the box "update moderator credentials" and paste the matching secret into the resulting text box. We only have to do this once for each browser (unless we later clear the credentials).

### Adding a discussion

Right now there is just a single default discussion, accessed through http://localhost:8000/?d=5X324. In future versions moderators will be able to add new discussions.

### Deploying

The app is set up to be served from Azure, though other service providers would presumably have similar requirements. 

Before the first run, make sure the app has access to the key vault: in the Azure portal for the key vault, under "access management", select "add role assignments", and grant the app read access to the secrets. Then, set the variable `KEY_VAULT_NAME` in the app's environment on the server.

For each time we deploy, create the zip archive for deployment: 

```
make zip
```

This will create the file `deploy.zip`, which we upload to the server: https://docs.microsoft.com/en-ca/azure/app-service/quickstart-nodejs?pivots=platform-linux#deploy-to-azure.


### Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions provided by the bot. You will only need to do this once across all repositories using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/)
or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

### Trademarks 

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow Microsoft's Trademark & Brand Guidelines. Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party's policies.
