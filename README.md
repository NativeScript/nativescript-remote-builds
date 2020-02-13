# nativescript-remote-builds

[![DimitarTachev](https://circleci.com/gh/DimitarTachev/nativescript-remote-builds.svg?style=svg)](https://circleci.com/gh/DimitarTachev/nativescript-remote-builds/tree/master)

The plugin enables **all NativeScript CLI features** and even adds an **additional `tns publish android`** support **without any local environment requirements for native development**. In other words, the plugin supports:

* Remote builds of NativeScript apps without any local environment requirements for native development.
* Remote publish of NativeScript apps by implementing the `tns publish android` (not available in the CLI without this plugin) and `tns publish ios` commands.
* A combination of remote builds and local deploy + LiveSync of `tns run`, `tns debug`, `tns test` any other build-related NativeScript CLI command and argument.

## Installation

It's just a regular NativeScript plugin and could be installed from npm:
1) `cd {{yourNativeScriptAppRoot}}`
2) `npm i nativescript-remote-builds`

In addition, as the plugin is written in JavaScript, it allows a direct GitHub installation:
1) `cd {{yourNativeScriptAppRoot}}`
2) `npm i https://github.com/DimitarTachev/nativescript-remote-builds/tarball/master`

## Setup

The plugin supports two configuration files expected in your **NativeScript app root directory**:

* `.nsremote.config.json` - the main plugin config where you have to select a `remote`, follow the [remote setup section](#remote-setup) for further details.
* `.nsremote.env.json` - an **optional file** allowing you to override the local and remote **environment variables**, most of them contain **sensitive** information and it's highly recommended to **ignore it from your source control**. 

> NOTE: Both of the files are used only locally and replaced with an empty file when the plugin sends your app to the remote.

## Remote Setup

* [Circle CI Setup](docs/CIRCLECI.md)

## Usage

Just use the NativeScript CLI commands as usual. The plugin hooks to the NativeScript CLI build process and replaces it with remote builds. In addition, the `tns publish android` command is now working and publishing the app from the remote.

## Local Builds

You can always use your local machine instead of the remote builds by providing the `--env.local` argument to your CLI commands. For example:

`$ tns run android --env.local`