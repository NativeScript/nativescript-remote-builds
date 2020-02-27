# nativescript-remote-builds

[![Build Status](https://travis-ci.com/NativeScript/nativescript-remote-builds.svg?branch=master)](https://travis-ci.com/NativeScript/nativescript-remote-builds)

Have you ever been wondering how to:
* build **NativeScript apps for iOS on Windows or Linux**?
* setup a **stable CI** for your NativeScript apps?
* avoid the **iOS code signing management**?

If so, the **NativeScript Remote Plugins** is just for you! :rocket:

## How does it work?

The plugin is using several **NativeScript CLI hooks** and modifying its behavior by:
* **Skipping** the local **[native tooling<sup>[1]</sup>](#tooling) requirements**.
* **Skipping the native resources** handling during the CLI **prepare phase** - they will be handled in the remote.
* **Replacing the CLI local build** with the build method of the selected remote.

The **rest of the CLI logic is working as usual**, for example, the *tns debug* command is preparing the JavaScript, uploading it to the connected devices, showing logs, opening debug sockets, showing an URL for debugging and so on.

## How does it differ from the NaticeScript CLI Cloud extension?

Comparing the cloud builds part of the [NativeScript Cloud extension](https://github.com/NativeScript/nativescript-cloud) and the [NativeScript Remote Builds plugin](https://github.com/NativeScript/nativescript-remote-builds), they look similar.

The main differences come from the fact that **the NativeScript Remote Builds plugin enables the existing NativeScript CLI commands on environments without any [native tooling<sup>[1]</sup>](#tooling) requirements** instead of providing additional commands like the `tns cloud` ones. The Remote Builds plugin is also **designed to be stable and reliable in a CI environement**.

Here's a comparison table between the NativeScript Cloud Extension and the NativeScript Remote Builds plugin:

|                                                                        |                 Cloud Extension               | Remote Builds Plugin |
| :---                                                                   |                      :---:                    |         :---:        |
| Build, Run and Publish without [native tooling<sup>[1]</sup>](#tooling)|               ![](https://i.imgur.com/v9VEBbf.png)              |  ![](https://i.imgur.com/v9VEBbf.png)  |
| Debug without [native tooling<sup>[1]</sup>](#tooling)                 |&nbsp;&nbsp;&nbsp;&nbsp;![](https://i.imgur.com/88WLiNS.png)[<sup>[2]</sup>](#cloudDebug)|  ![](https://i.imgur.com/v9VEBbf.png)  |
| Run Unit Tests without [native tooling<sup>[1]</sup>](#tooling)                  |                       ![](https://i.imgur.com/JcfimjC.png)                     |  ![](https://i.imgur.com/v9VEBbf.png)  |
| [Automatic iOS Signing Management<sup>[3]</sup>](#signing)                       |                       ![](https://i.imgur.com/JcfimjC.png)                     |  ![](https://i.imgur.com/v9VEBbf.png)  |
| [Full CI Support<sup>[4]</sup>](#ci)                              |                       ![](https://i.imgur.com/JcfimjC.png)                     |  ![](https://i.imgur.com/v9VEBbf.png)  |
| [Full Environment Information<sup>[5]</sup>](#envInfo)                 |                       ![](https://i.imgur.com/JcfimjC.png)                     |  ![](https://i.imgur.com/v9VEBbf.png)  |
| [Full Environment Control<sup>[6]</sup>](#envControl)                     |                       ![](https://i.imgur.com/JcfimjC.png)                     |  ![](https://i.imgur.com/v9VEBbf.png)  |
| Just the default NativeScript CLI commands                 |                       ![](https://i.imgur.com/JcfimjC.png)                     |  ![](https://i.imgur.com/v9VEBbf.png)  |
| Free                                                       |&nbsp;&nbsp;&nbsp;&nbsp;![](https://i.imgur.com/88WLiNS.png)[<sup>[7]</sup>](#cloudPrice)|&nbsp;&nbsp;&nbsp;&nbsp;![](https://i.imgur.com/88WLiNS.png)[<sup>[8]</sup>](#pluginPrice)|

> *The comparison is based on the CircleCI remote of the NativeScript Remote Builds Plugin*

<dl>
  <dt><span id="tooling">native tooling<sup>[1]</sup></span></dt>
  <dd>Any native environment requirements like Java, Android SDK, Android Studio, macOS, Xcode, Cocoapods, Docker and so on.</dd>

  <dt><span id="cloudDebug">cloud extension debug support<sup>[2]</sup></span></dt>
  <dd>It is available only through NativeScript Sidekick.</dd>

  <dt><span id="signing">iOS signing management<sup>[3]</sup></span></dt>
  <dd>If the end-user is responsible for passing the `--provision` flag and picking the proper certificate based on the current build configuration. In the Remote Builds plugin, this is handled out of the box by the <a href="https://docs.fastlane.tools/actions/match/">Fastlane Match service</a>.</dd>

  <dt><span id="ci">full CI support<sup>[4]</sup></span></dt>
  <dd>If the user can build and run tests on pull requests or commits. In other words, if it is supported to build multiple versions of the same app in parallel.</dd>

  <dt><span id="envInfo">full environment information<sup>[5]</sup></span></dt>
  <dd>If the full environment information is available to the users (e.g. the versions of the OS and the <a href="#tooling">native tooling<sup>[1]</sup></a>.</dd>

  <dt><span id="envControl">full environment control<sup>[6]</sup></span></dt>
  <dd>If the environment setup can be controlled by the user (e.g. change the versions of the os and the <a href="#tooling">native tooling<sup>[1]</sup></a>.</dd>

  <dt><span id="cloudPrice">cloud extension price<sup>[7]</sup></span></dt>
  <dd>The NativeScript Cloud extensions is providing a limited number of free builds.</dd>

  <dt><span id="pluginPrice">remote builds plugin price<sup>[8]</sup></span></dt>
  <dd>The Circle CI provider of the NativeScript Remote Builds plugin is just depending on the <a href="https://circleci.com/pricing/">Circle CI pricing</a>. It provides a limited number of free Android Builds for everyone and a limited number of <a href="https://circleci.com/open-source/">free iOS builds for open-source projects</a>.</dd>
</dl>


## Installation

It's just a regular NativeScript plugin and could be installed from npm:
1) `cd {{yourNativeScriptAppRoot}}`
2) `npm i nativescript-remote-builds`

In addition, as the plugin is written in JavaScript, it allows a direct GitHub installation:
1) `cd {{yourNativeScriptAppRoot}}`
2) `npm i https://github.com/NativeScript/nativescript-remote-builds/tarball/master`

> IMPORTANT: The plugin depends on NativeScript CLI hooks even before the CLI installs the node packages. If you delete your `node_modules` folder, ensure that `npm i` is called before the `tns` commands, otherwise you could get unexpected exceptions. 

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