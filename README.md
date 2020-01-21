# nativescript-cloud-builds
A NativeScript plugin for Circle CI based `tns run android/ios` without env setup.

## Prerequisites

1) [CircleCI](https://circleci.com/) account integrated with your GitHub organization.
2) SSH key [configured in your GitHub account](https://help.github.com/en/github/authenticating-to-github/adding-a-new-ssh-key-to-your-github-account).

## Installation

1) `cd {{yourNativeScriptAppRoot}}`
2) `npm i https://github.com/DimitarTachev/nativescript-cloud-builds/tarball/master`

## Setup

1) Create a `.nscloudbuilds.json` file in your app root directory with the following content:
```
{
    "cloudSyncGithubRepository": "{{an SSH GitHub repository url with enabled CircleCI integration}}"
}
```

* If your NativeScript app is already pushed to a GitHub repository [integrated with CircleCI](https://circleci.com/docs/2.0/project-build/#adding-projects), you could reuse the same repository as `{{cloudSyncGithubRepository}}`. The plugin will create temporary branches named `circle-ci{{uniqueid}}` for each cloud operation and will not affect you current branches.
* If you don't have an already configured GitHub repository for your NativeScript app, you could pass a newly created repository [integrated with CircleCI](https://circleci.com/docs/2.0/project-build/#adding-projects).

> WARNING: The `{{cloudSyncGithubRepository}}` repository will be used to sync your local code changes with the cloud. If the repository is public, make sure that you don't have any sensitive data (e.g. secrets) which are not git ignored in your local app.  

> NOTE: The `.nscloudbuilds.json` will NOT be pushed in the `{{cloudSyncGithubRepository}}` and you could also git ignore it if you assume its content as a sensitive data.
2) Set the `CIRCLE_CI_API_ACCESS_TOKEN` env variable to your local machine. You could generate one from your [Personal API Tokens](https://circleci.com/account/api) page in Circle CI. Take a look at [this article](https://circleci.com/docs/2.0/managing-api-tokens/#creating-a-personal-api-token) for more details.

> WARNING: You have to be logged in in order to access the [Personal API Tokens](https://circleci.com/account/api) page.  

## iOS Specific Setup

> IMPORTANT: in order to use iOS cloud builds, you need iOS Runtime version >= 6.4.0 (containing a fastlane compatible Xcode project)

> NOTE: If you are building an open source project, you could apply for a free CircleCI iOS builds here: https://circleci.com/open-source 

In order to use iOS cloud build you need to provide a few more `.nscloudbuilds.json` and CircleCI configurations related to the iOS code signing.

> IMPORTANT: You will need an administrator access to a paid apple developer account in order to complete this setup.

1) Run the `fastlane match development` command, follow the `Git Repository` flow. 

> NOTE: You could read more about `fastlane match` and the development provisioning profile generation in the following article: https://docs.fastlane.tools/actions/match/

2) Add the following configurations in your `.nscloudbuilds.json`:
```
...
    "appleId": "{{the apple id used for the fastlane match configurations}}",
    "iOSDevProfileName": "{{the name of the development profile created by fastlane match development command}}",
    "iOSTeamId": "{{the team id used in the fastlane match setup}}",
    "iOSSigningPrivateGithubRepository": "{{a private github repository to keep the iOS provisioning profiles used by fastlane}}"
...
```

3) Add a private SSH key (without password) for accessing the `{{iOSSigningPrivateGithubRepository}}` in your CircleCI `{{cloudSyncGithubRepository}}` `SSH Permissions` settings.

4) Add a `MATCH_PASSWORD` env variable with your `fastlane match` password in your CircleCI `{{cloudSyncGithubRepository}}` `Environment Variables` settings.

## Usage

TODO: ...

## Security

TODO: ....