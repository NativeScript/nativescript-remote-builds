const path = require("path");
const _ = require("lodash");

class GitService {
    constructor($childProcess, $fs, $logger, gitDirsPath, gitRepoName, workingDirectory) {
        this.$childProcess = $childProcess;
        this.$fs = $fs;
        this.$logger = $logger;
        this.gitDirsPath = gitDirsPath;
        this.gitRepoName = gitRepoName;
        this.workingDirectory = workingDirectory;
    }

    async gitPushChanges(remoteUrl, mappedFiles, placeholders, branchId) {
        // a workaround for a sporadic "git exited with code 1"
        this.cleanGitRepository();
        await this.gitInit();
        const isRemoteAdded = await this.gitCheckIfRemoteIsAdded(GitService.REMOTE_NAME);
        if (isRemoteAdded) {
            const isGitRemoteCorrect = await this.isGitRemoteSetToCorrectUrl(remoteUrl);
            if (!isGitRemoteCorrect) {
                await this.gitSetRemoteUrl(GitService.REMOTE_NAME, remoteUrl);
            }
        }
        else {
            await this.gitRemoteAdd(remoteUrl);
        }
        await this.ensureGitIgnoreExists(this.workingDirectory);
        const isAutocrlfFalse = await this.gitCheckIfAutocrlfIsFalse();
        if (!isAutocrlfFalse) {
            this.$logger.trace("Setting core.autocrlf to false");
            // Commit line ending as is, do not allow git to change them.
            await this.executeCommand(["config", "--local", "core.autocrlf", "false"]);
        }

        await this.checkoutBranch(GitService.BRANCH_NAME_PREFIX + branchId);
        const statusResult = await this.gitStatus();
        this.$logger.trace(`Result of git status: ${statusResult}.`);
        let revision;
        if (this.hasNothingToCommit(statusResult.stdout)) {
            this.$logger.trace("Nothing to commit. Just push force the branch.");
            await this.gitPush(branchId);
            revision = await this.getCurrentRevision();
            return revision;
        }
        await this.gitAdd();
        for (const localFile in mappedFiles) {
            const gitFile = mappedFiles[localFile];
            if (this.$fs.exists(gitFile)) {
                try {
                    await this.gitRemoveFile(gitFile);
                } catch (e) {
                    // already gitignored
                }
            }

            const gitDir = this.getGitDirPath();
            const destination = path.join(gitDir, gitFile);
            if (this.$fs.exists(destination)) {
                this.$fs.deleteDirectory(destination);
            }

            let fileContent = this.$fs.readText(localFile);
            for (const placeholder in placeholders) {
                fileContent = fileContent.replace(new RegExp(`{{${placeholder}}}`, "g"), placeholders[placeholder]);
            }

            this.$fs.writeFile(destination, fileContent);
            await this.gitAdd(gitFile, true);
        }

        await this.gitCommit();
        await this.gitPush(branchId);
        revision = await this.getCurrentRevision();
        return revision;
    }

    async checkoutBranch(branchId) {
        try {
            await this.executeCommand(["checkout", branchId]);
        }
        catch (error) {
            await this.executeCommand(["checkout", "-b", branchId]);
        }
    }

    async gitDeleteBranch(cliBuildId) {
        // in order to delete the local branch, we need to change the checked out one
        await this.checkoutBranch("master");
        // remove local branch
        await this.executeCommand(["branch", "-D", GitService.BRANCH_NAME_PREFIX + cliBuildId])
        // remove remote branch
        const env = _.assign({}, process.env);
        return this.executeCommand(["push", "-d", GitService.REMOTE_NAME, GitService.BRANCH_NAME_PREFIX + cliBuildId], { env, cwd: this.workingDirectory });
    }

    async getCurrentRevision() {
        const revisionCommandResult = await this.executeCommand(["rev-parse", "HEAD"]);
        return revisionCommandResult.stdout.trim();
    }
    async isGitRemoteSetToCorrectUrl(remoteUrl) {
        const result = await this.executeCommand(["remote", "-v"]);
        return result.stdout.indexOf(remoteUrl.httpRemoteUrl) !== -1;
    }

    async gitRemoveFile(relativeFilePath) {
        return this.executeCommand(["rm", "--cached", relativeFilePath]);
    }

    async gitInit() {
        return this.executeCommand(["init"]);
    }
    async gitCommit() {
        return this.executeCommand(["commit", `-m "cloud-commit-${new Date().toString()}"`]);
    }
    async gitAdd(pattern, inGitDir) {
        const args = ["add"];
        if (pattern) {
            args.push(pattern);
        } else {
            args.push(this.workingDirectory)
        }

        return this.executeCommand(args, null, null, inGitDir);
    }
    async gitStatus() {
        return this.executeCommand(["status"]);
    }
    async gitPush(cliBuildId) {
        const env = _.assign({}, process.env);
        return this.executeCommand(["push", "--force", GitService.REMOTE_NAME, GitService.BRANCH_NAME_PREFIX + cliBuildId], { env, cwd: this.workingDirectory });
    }
    async gitRemoteAdd(remoteUrl) {
        return this.executeCommand(["remote", "add", GitService.REMOTE_NAME, remoteUrl.httpRemoteUrl]);
    }
    async gitSetRemoteUrl(remoteName, remoteUrl) {
        await this.executeCommand(["remote", "set-url", remoteName, remoteUrl.httpRemoteUrl]);
    }
    async gitCheckIfRemoteIsAdded(remoteName) {
        try {
            await this.executeCommand(["remote", "get-url", remoteName]);
            return true;
        }
        catch (err) {
            this.$logger.trace("Error while checking if remote is added: ", err);
            return false;
        }
    }
    async gitCheckIfAutocrlfIsFalse() {
        try {
            const result = await this.executeCommand(["config", "core.autocrlf"]);
            return result && result.stdout && result.stdout.toString().trim().toLowerCase() === "false";
        }
        catch (err) {
            this.$logger.trace("Error while checking if core.autocrlf is false: ", err);
            return false;
        }
    }
    async executeCommand(args, options, spawnFromEventOptions, inGitDir) {
        options = options || { cwd: this.workingDirectory };
        const gitDir = this.getGitDirPath();
        this.$fs.ensureDirectoryExists(gitDir);
        args = [`--git-dir=${gitDir}`, `--work-tree=${inGitDir ? gitDir : this.workingDirectory}`].concat(args);
        return this.$childProcess.spawnFromEvent("git", args, "close", options, spawnFromEventOptions);
    }
    isGitRepository() {
        return this.$fs.exists(this.getGitDirPath());
    }
    cleanGitRepository() {
        const gitDir = this.getGitDirPath();
        if (this.$fs.exists(gitDir)) {
            this.$fs.deleteDirectory(gitDir);
        }
    }
    getGitDirPath() {
        return path.join(this.getGitDirBasePath(), this.gitRepoName);
    }
    getGitDirBasePath() {
        return path.join(this.gitDirsPath, GitService.GIT_DIR_NAME);
    }
    ensureGitIgnoreExists(workingDir) {
        const gitIgnorePath = path.join(workingDir, GitService.GIT_IGNORE_FILE_NAME);
        this.$logger.trace(`Ensure ${gitIgnorePath} exists.`);
        if (!this.$fs.exists(gitIgnorePath)) {
            this.$logger.trace(`${gitIgnorePath} does not exist. Creating a default one.`);
            this.$fs.copyFile(path.join(__dirname, "..", "..", "configs", "basic-gitignore"), gitIgnorePath);
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

module.exports.GitService = GitService;
