# headless-delphi
Web app to facilitate roundless, headless Delphi-style discussions

### Getting started

To run locally:

```
make run
```

Then browse to https://localhost:8000/.
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
