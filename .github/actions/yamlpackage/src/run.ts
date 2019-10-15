import * as core from "@actions/core";
import {PackageSettings} from "./PackageSettings";
import { PackageOperation } from "./PackageOperation";
import { IImageDigestProvider, ImageDigestProvider } from "./ImageDigestProvider";
import { ICommandLine, CommandLine } from "./CommandLine";

async function run(): Promise<void> {
    try {
        const settings: PackageSettings = new PackageSettings(core.getInput);
        const commandLine: ICommandLine = new CommandLine();
        const imageDigestProvider: IImageDigestProvider = new ImageDigestProvider(commandLine);
        await settings.updateDigests(imageDigestProvider);
        const packageOperation: PackageOperation = new PackageOperation(settings);
        await packageOperation.package();
    } catch (error) {
        core.debug("Yaml package failed.");
        core.setFailed(error);
    }
}

run();