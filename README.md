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

### Adding a discussion

### Deploying

To deploy to an app service like Azure: use

```
make zip
```

to create the file `deploy.zip`. Then upload this file; instructions for one method of uploading are at https://docs.microsoft.com/en-ca/azure/app-service/quickstart-nodejs?pivots=platform-linux#deploy-to-azure.

