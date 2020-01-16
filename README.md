# nativescript-cloud-builds
A NativeScript plugin for Circle CI based `tns run android/ios` without env setup.

## Installation

> npm i https://github.com/DimitarTachev/nativescript-cloud-builds/tarball/master

## Setup

1) Login in CircleCI and integrate your GitHub organization
2) Create a `.nscloudbuilds.json` file in your app root directory with the following content:
```
{
    "cloudSyncGithubRepository": "{{a github repository with enable CircleCI integration}}",
    "circleCiApiAccessToken": "{{a circle ci API token for your account}}",
}
```

> WARNING: The `cloudSyncGithubRepository` will be used to sync your local code changes with the cloud. If the repository is public, make sure that you don't have any sensitive data (e.g. secrets) which are not git ignored in your local app.  

> NOTE: The `.nscloudbuilds.json` will NOT be pushed in the `cloudSyncGithubRepository` and you could also git ignore it if your app is in a public repository.


## iOS Specific Setup

> IMPORTANT: in order to use iOS cloud builds, you need iOS Runtime version >= 6.4.0 (containing a fastlane compatible Xcode project)

> NOTE: If you are building an open source project, you could apply for a free CircleCI iOS builds here: https://circleci.com/open-source 

In order to use iOS cloud build you need to provide a few more `.nscloudbuilds.json` and CircleCI configurations related to the iOS code signing.

> IMPORTANT! You will need an administrator access to a paid apple developer account in order to complete this setup.

1) Run the `fastlane match development` command, follow the `Git Repository` flow. 

> INFO: You could read more about `fastlane match` and the development provisioning profile generation in the following article: https://docs.fastlane.tools/actions/match/

2) Add the following configurations in your `.nscloudbuilds.json`:
```
...
    "appleId": "{{ the apple id used for the fastlane match configurations }}",
    "iOSDevProfileName": "{{ the name of the development profile created by fastlane match development command }}",
    "iOSTeamId": "{{ the team id used in the fastlane match setup }}",
    "iOSSigningPrivateGithubRepo": "{{ a private github repository to keep the iOS provisioning profiles used by fastlane }}"
...
```

3) Add a private SSH key (without password) for accessing the `iOSSigningPrivateGithubRepo` in your CircleCI `{{cloudSyncGithubRepository}}` `SSH Permissions` settings.

4) Add a `MATCH_PASSWORD` env variable with your `fastlane match` password in your CircleCI `{{cloudSyncGithubRepository}}` `Environment Variables` settings.
