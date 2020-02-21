# nativescript-remote-builds

[![Build Status](https://travis-ci.com/NativeScript/nativescript-remote-builds.svg?branch=master)](https://travis-ci.com/NativeScript/nativescript-remote-builds)

The plugin enables **all NativeScript CLI features** and even adds an **additional `tns publish android`** support **without any local environment requirements for native development**. In other words, the plugin supports:

* Remote builds of NativeScript apps without any local environment requirements for native development.
* Remote publish of NativeScript apps by implementing the `tns publish android` (not available in the CLI without this plugin) and `tns publish ios` commands.
* A combination of remote builds and local deploy + LiveSync of `tns run`, `tns debug`, `tns test` any other build-related NativeScript CLI command and argument.

Here's a comparison between the NativeScript CLI, the NativeScript CLI Cloud Extension and this NativeScript Remote Builds plugin (the comparison is based on the Circle CI remote): 
<table>
    <thead>
        <tr>
            <th></th>
            <th colspan=3>NativeScript CLI</th>
            <th colspan=3>Cloud Extension</th>
            <th colspan=3>Remote Builds Plugin</th>
        </tr>
        <tr>
            <th></th>
            <th>Win</th>
            <th>Linux</th>
            <th>Mac</th>
            <th>Win</th>
            <th>Linux</th>
            <th>Mac</th>
            <th>Win</th>
            <th>Linux</th>
            <th>Mac</th>
        </tr>
    </thead>
    <tbody align="center">
        <tr>
            <td align="left">Works Without Native Tools Setup</td>
            <!-- CLI win -->
            <td>:x:</td>
            <!-- CLI linux -->
            <td>:x:</td>
            <!-- CLI mac -->
            <td>:x:</td>
            <!-- Cloud win -->
            <td>:white_check_mark:</td>
            <!-- Cloud linux -->
            <td>:white_check_mark:</td>
            <!-- Cloud mac -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">iOS Signing Management<sup>[1]</sup></td>
            <!-- CLI win -->
            <td>:x:</td>
            <!-- CLI linux -->
            <td>:x:</td>
            <!-- CLI mac -->
            <td>:x:</td>
            <!-- Cloud win -->
            <td>:x:</td>
            <!-- Cloud linux -->
            <td>:x:</td>
            <!-- Cloud mac -->
            <td>:x:</td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">Build Android</td>
            <!-- CLI win -->
            <td>:white_check_mark:</td>
            <!-- CLI linux -->
            <td>:white_check_mark:</td>
            <!-- CLI mac -->
            <td>:white_check_mark:</td>
            <!-- Cloud win -->
            <td>:white_check_mark:</td>
            <!-- Cloud linux -->
            <td>:white_check_mark:</td>
            <!-- Cloud mac -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">Build iOS</td>
            <!-- CLI win -->
            <td>:x:</td>
            <!-- CLI linux -->
            <td>:x:</td>
            <!-- CLI mac -->
            <td>:white_check_mark:</td>
            <!-- Cloud win -->
            <td>:white_check_mark:</td>
            <!-- Cloud linux -->
            <td>:white_check_mark:</td>
            <!-- Cloud mac -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">Run Android</td>
            <!-- CLI win -->
            <td>:white_check_mark:</td>
            <!-- CLI linux -->
            <td>:white_check_mark:</td>
            <!-- CLI mac -->
            <td>:white_check_mark:</td>
            <!-- Cloud win -->
            <td>:white_check_mark:</td>
            <!-- Cloud linux -->
            <td>:white_check_mark:</td>
            <!-- Cloud mac -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">Run iOS</td>
            <!-- CLI win -->
            <td>:x:</td>
            <!-- CLI linux -->
            <td>:x:</td>
            <!-- CLI mac -->
            <td>:white_check_mark:</td>
            <!-- Cloud win -->
            <td>:white_check_mark:</td>
            <!-- Cloud linux -->
            <td>:white_check_mark:</td>
            <!-- Cloud mac -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">Debug Android</td>
            <!-- CLI win -->
            <td>:white_check_mark:</td>
            <!-- CLI linux -->
            <td>:white_check_mark:</td>
            <!-- CLI mac -->
            <td>:white_check_mark:</td>
            <!-- Cloud win -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[5]</sup></td>
            <!-- Cloud linux -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[5]</sup></td>
            <!-- Cloud mac -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[5]</sup></td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">Debug iOS</td>
            <!-- CLI win -->
            <td>:x:</td>
            <!-- CLI linux -->
            <td>:x:</td>
            <!-- CLI mac -->
            <td>:white_check_mark:</td>
            <!-- Cloud win -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[5]</sup></td>
            <!-- Cloud linux -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[5]</sup></td>
            <!-- Cloud mac -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[5]</sup></td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">Test Android</td>
            <!-- CLI win -->
            <td>:white_check_mark:</td>
            <!-- CLI linux -->
            <td>:white_check_mark:</td>
            <!-- CLI mac -->
            <td>:white_check_mark:</td>
            <!-- Cloud win -->
            <td>:x:</td>
            <!-- Cloud linux -->
            <td>:x:</td>
            <!-- Cloud mac -->
            <td>:x:</td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">Test iOS</td>
            <!-- CLI win -->
            <td>:x:</td>
            <!-- CLI linux -->
            <td>:x:</td>
            <!-- CLI mac -->
            <td>:white_check_mark:</td>
            <!-- Cloud win -->
            <td>:x:</td>
            <!-- Cloud linux -->
            <td>:x:</td>
            <!-- Cloud mac -->
            <td>:x:</td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">Publish Android</td>
            <!-- CLI win -->
            <td>:x:</td>
            <!-- CLI linux -->
            <td>:x:</td>
            <!-- CLI mac -->
            <td>:x:</td>
            <!-- Cloud win -->
            <td>:white_check_mark:</td>
            <!-- Cloud linux -->
            <td>:white_check_mark:</td>
            <!-- Cloud mac -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">Publish iOS</td>
            <!-- CLI win -->
            <td>:x:</td>
            <!-- CLI linux -->
            <td>:x:</td>
            <!-- CLI mac -->
            <td>:white_check_mark:</td>
            <!-- Cloud win -->
            <td>:white_check_mark:</td>
            <!-- Cloud linux -->
            <td>:white_check_mark:</td>
            <!-- Cloud mac -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">Full CI Support<sup>[2]</sup></td>
            <!-- CLI win -->
            <td>:x:</td>
            <!-- CLI linux -->
            <td>:x:</td>
            <!-- CLI mac -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[6]</sup></td>
            <!-- Cloud win -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[7]</sup></td>
            <!-- Cloud linux -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[7]</sup></td>
            <!-- Cloud mac -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[7]</sup></td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">Full Environment Information<sup>[3]</sup></td>
            <!-- CLI win -->
            <td>:white_check_mark:</td>
            <!-- CLI linux -->
            <td>:white_check_mark:</td>
            <!-- CLI mac -->
            <td>:white_check_mark:</td>
            <!-- Cloud win -->
            <td>:x:</td>
            <!-- Cloud linux -->
            <td>:x:</td>
            <!-- Cloud mac -->
            <td>:x:</td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">Full Environment Control<sup>[4]</sup></td>
            <!-- CLI win -->
            <td>:white_check_mark:</td>
            <!-- CLI linux -->
            <td>:white_check_mark:</td>
            <!-- CLI mac -->
            <td>:white_check_mark:</td>
            <!-- Cloud win -->
            <td>:x:</td>
            <!-- Cloud linux -->
            <td>:x:</td>
            <!-- Cloud mac -->
            <td>:x:</td>
            <!-- Remote Builds win -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds linux -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds mac -->
            <td>:white_check_mark:</td>
        </tr>
        <tr>
            <td align="left">Works without local Git</td>
            <!-- CLI win -->
            <td>:white_check_mark:</td>
            <!-- CLI linux -->
            <td>:white_check_mark:</td>
            <!-- CLI mac -->
            <td>:white_check_mark:</td>
            <!-- Cloud win -->
            <td>:white_check_mark:</td>
            <!-- Cloud linux -->
            <td>:white_check_mark:</td>
            <!-- Cloud mac -->
            <td>:white_check_mark:</td>
            <!-- Remote Builds win -->
            <td>:x:</td>
            <!-- Remote Builds linux -->
            <td>:x:</td>
            <!-- Remote Builds mac -->
            <td>:x:</td>
        </tr>
        <tr>
            <td align="left">Free</td>
            <!-- CLI win -->
            <td>:white_check_mark:</td>
            <!-- CLI linux -->
            <td>:white_check_mark:</td>
            <!-- CLI mac -->
            <td>:white_check_mark:</td>
            <!-- Cloud win -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[8]</sup></td>
            <!-- Cloud linux -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[8]</sup></td>
            <!-- Cloud mac -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[8]</sup></td>
            <!-- Remote Builds win -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[9]</sup></td>
            <!-- Remote Builds linux -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[9]</sup></td>
            <!-- Remote Builds mac -->
            <td>&nbsp;&nbsp;&nbsp;&nbsp;:warning:<sup>[9]</sup></td>
        </tr>
    </tbody>
</table>


[1] If the end-user is responsible for passing the --provision flag and pick the proper certificate based on the current application and build configuration. In this plugin this task is handled out of the box by the Fastlane Match service.

[2] If the end user can run tests on pull requests or commits. In other words, if it is supported to build multiple versions of the same app in parallel and still stable.

[3] If the full environment information is available to the users (e.g. the versions of the CLI, cocoapods, android SDK, OS or xcode).

[4] If the environment setup can be controlled by the user (e.g. change the CLI, cocoapods or Xcode version). 

[5] Available only through NativeScript SideKick.

[6] Requires native tools setup.

[7] Cannot build in parallel.

[8] The NativeScript Cloud extensions is providing  a limited number of free builds.

[9] The Circle CI provider of the NativeScript Remote Builds plugin is just depending on the Circle CI pricing. It provides limited number of free Android Builds for everyone and limited number of free iOS builds for open-source projects. 

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