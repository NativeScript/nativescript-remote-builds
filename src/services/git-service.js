const path = require("path");

class GitService {
    constructor($childProcess, $fs,
        $logger, profileDir) {
        this.$childProcess = $childProcess;
        this.$fs = $fs;
        this.$logger = $logger;
        this.profileDir = profileDir;
    }

    async gitPushChanges(projectSettings, remoteUrl, mappedFiles, placeholders, cliBuildId) {
        // a workaround for a sporadic "git exited with code 1"
        this.cleanGitRepository(projectSettings);
        await this.gitInit(projectSettings);
        const isRemoteAdded = await this.gitCheckIfRemoteIsAdded(projectSettings, GitService.REMOTE_NAME);
        if (isRemoteAdded) {
            const isGitRemoteCorrect = await this.isGitRemoteSetToCorrectUrl(projectSettings, remoteUrl);
            if (!isGitRemoteCorrect) {
                await this.gitSetRemoteUrl(projectSettings, GitService.REMOTE_NAME, remoteUrl);
            }
        }
        else {
            await this.gitRemoteAdd(projectSettings, remoteUrl);
        }
        await this.ensureGitIgnoreExists(projectSettings.projectDir);
        const isAutocrlfFalse = await this.gitCheckIfAutocrlfIsFalse(projectSettings);
        if (!isAutocrlfFalse) {
            this.$logger.trace("Setting core.autocrlf to false");
            // Commit line ending as is, do not allow git to change them.
            await this.executeCommand(projectSettings, ["config", "--local", "core.autocrlf", "false"]);
        }

        try {
            await this.executeCommand(projectSettings, ["checkout", GitService.BRANCH_NAME_PREFIX + cliBuildId]);
        }
        catch (error) {
            await this.executeCommand(projectSettings, ["checkout", "-b", GitService.BRANCH_NAME_PREFIX + cliBuildId]);
        }
        const statusResult = await this.gitStatus(projectSettings);
        this.$logger.trace(`Result of git status: ${statusResult}.`);
        let revision;
        if (this.hasNothingToCommit(statusResult.stdout)) {
            this.$logger.trace("Nothing to commit. Just push force the branch.");
            await this.gitPush(projectSettings, cliBuildId);
            revision = await this.getCurrentRevision(projectSettings);
            return revision;
        }
        await this.gitAdd(projectSettings);
        for (const localFile in mappedFiles) {
            const gitFile = mappedFiles[localFile];
            if (this.$fs.exists(gitFile)) {
                await this.gitRemoveFile(projectSettings, gitFile);
            }

            const gitDir = this.getGitDirPath(projectSettings);
            const destination = path.join(gitDir, gitFile);
            if (this.$fs.exists(destination)) {
                this.$fs.deleteDirectory(destination);
            }

            let fileContent = this.$fs.readText(localFile);
            for (const placeholder in placeholders) {
                fileContent = fileContent.replace(new RegExp(`{{${placeholder}}}`, "g"), placeholders[placeholder]);
            }

            this.$fs.writeFile(destination, fileContent);
            await this.gitAdd(projectSettings, gitFile, true);
        }

        await this.gitCommit(projectSettings);
        await this.gitPush(projectSettings, cliBuildId);
        revision = await this.getCurrentRevision(projectSettings);
        return revision;
    }

    async gitDeleteBranch(projectSettings, cliBuildId) {
        // remove local branch
        await this.executeCommand(projectSettings, ["branch", "-D", GitService.BRANCH_NAME_PREFIX + cliBuildId])
        // remove remote branch
        const env = _.assign({}, process.env);
        return this.executeCommand(projectSettings, ["push", "-d", GitService.REMOTE_NAME, GitService.BRANCH_NAME_PREFIX + cliBuildId], { env, cwd: projectSettings.projectDir });
    }

    async getCurrentRevision(projectSettings) {
        const revisionCommandResult = await this.executeCommand(projectSettings, ["rev-parse", "HEAD"]);
        return revisionCommandResult.stdout.trim();
    }
    async isGitRemoteSetToCorrectUrl(projectSettings, remoteUrl) {
        const result = await this.executeCommand(projectSettings, ["remote", "-v"]);
        return result.stdout.indexOf(remoteUrl.httpRemoteUrl) !== -1;
    }

    async gitRemoveFile(projectSettings, relativeFilePath) {
        // TODO: fix existing fastlane
        return this.executeCommand(projectSettings, ["rm", "--cached", relativeFilePath]);
    }

    async gitInit(projectSettings) {
        return this.executeCommand(projectSettings, ["init"]);
    }
    async gitCommit(projectSettings) {
        return this.executeCommand(projectSettings, ["commit", `-m "cloud-commit-${new Date().toString()}"`]);
    }
    async gitAdd(projectSettings, pattern, inGitDir) {
        const args = ["add"];
        if (pattern) {
            args.push(pattern);
        } else {
            args.push(projectSettings.projectDir)
        }

        return this.executeCommand(projectSettings, args, null, null, inGitDir);
    }
    async gitStatus(projectSettings) {
        return this.executeCommand(projectSettings, ["status"]);
    }
    async gitPush(projectSettings, cliBuildId) {
        const env = _.assign({}, process.env);
        return this.executeCommand(projectSettings, ["push", "--force", GitService.REMOTE_NAME, GitService.BRANCH_NAME_PREFIX + cliBuildId], { env, cwd: projectSettings.projectDir });
    }
    async gitRemoteAdd(projectSettings, remoteUrl) {
        return this.executeCommand(projectSettings, ["remote", "add", GitService.REMOTE_NAME, remoteUrl.httpRemoteUrl]);
    }
    async gitSetRemoteUrl(projectSettings, remoteName, remoteUrl) {
        await this.executeCommand(projectSettings, ["remote", "set-url", remoteName, remoteUrl.httpRemoteUrl]);
    }
    async gitCheckIfRemoteIsAdded(projectSettings, remoteName) {
        try {
            await this.executeCommand(projectSettings, ["remote", "get-url", remoteName]);
            return true;
        }
        catch (err) {
            this.$logger.trace("Error while checking if remote is added: ", err);
            return false;
        }
    }
    async gitCheckIfAutocrlfIsFalse(projectSettings) {
        try {
            const result = await this.executeCommand(projectSettings, ["config", "core.autocrlf"]);
            return result && result.stdout && result.stdout.toString().trim().toLowerCase() === "false";
        }
        catch (err) {
            this.$logger.trace("Error while checking if core.autocrlf is false: ", err);
            return false;
        }
    }
    async executeCommand(projectSettings, args, options, spawnFromEventOptions, inGitDir) {
        options = options || { cwd: projectSettings.projectDir };
        const gitDir = this.getGitDirPath(projectSettings);
        this.$fs.ensureDirectoryExists(gitDir);
        args = [`--git-dir=${gitDir}`, `--work-tree=${inGitDir ? gitDir : projectSettings.projectDir}`].concat(args);
        // TODO: test on Windows
        return this.$childProcess.spawnFromEvent("git", args, "close", options, spawnFromEventOptions);
    }
    isGitRepository(projectSettings) {
        return this.$fs.exists(this.getGitDirPath(projectSettings));
    }
    cleanGitRepository(projectSettings) {
        const gitDir = this.getGitDirPath(projectSettings);
        if (this.$fs.exists(gitDir)) {
            this.$fs.deleteDirectory(gitDir);
        }
    }
    getGitDirPath(projectSettings) {
        return path.join(this.getGitDirBasePath(), projectSettings.projectId);
    }
    getGitDirBasePath() {
        return path.join(this.profileDir, GitService.GIT_DIR_NAME);
    }
    ensureGitIgnoreExists(projectDir) {
        const gitIgnorePath = path.join(projectDir, GitService.GIT_IGNORE_FILE_NAME);
        this.$logger.trace(`Ensure ${gitIgnorePath} exists.`);
        if (!this.$fs.exists(gitIgnorePath)) {
            this.$logger.trace(`${gitIgnorePath} does not exist. Creating a default one.`);
            this.$fs.copyFile(path.join(__dirname, "..", "common", "basic-gitignore"), gitIgnorePath);
        }
    }
    hasNothingToCommit(stdout) {
        return /nothing to commit/.test(stdout);
    }
}

GitService.REMOTE_NAME = "circleci";
GitService.BRANCH_NAME_PREFIX = "circle-ci-";
GitService.GIT_DIR_NAME = ".circle-ci-git";
GitService.GIT_IGNORE_FILE_NAME = ".gitignore";
GitService.TEMPLATE_GIT_IGNORE_FILE_NAME = "defaultGitIgnore";


module.exports.GitService = GitService;