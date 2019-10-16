import { ICommandLine, CommandLineResult } from "./CommandLine";
import { ImageName } from "./ImageName";

export interface IImageDigestProvider {
    getDigest(imageName: ImageName): Promise<string>;
}

export class ImageDigestProvider implements IImageDigestProvider {
    constructor(private readonly commandLine: ICommandLine) {
    }

    public async getDigest(imageName: ImageName): Promise<string> {
        const args: string[] = ["inspect", imageName.toString(), "--format", "\"{{ json .RepoDigests }}\""];
        const result: CommandLineResult = await this.commandLine.exec("docker", args);
        if (!result.success || !result.stdOut) {
            return "";
        }

        // trim quotation marks from beginning and end of output
        let stdOut: string = result.stdOut.trim();
        if (stdOut.length > 2) {
            if (stdOut.endsWith("\"")) {
                stdOut = stdOut.substring(0, stdOut.length - 1);
            }
            if (stdOut.startsWith("\"")) {
                stdOut = stdOut.substring(1);
            }
        }

        const json: any = JSON.parse(stdOut);
        if (!json) {
            return "";
        }

        for (let digest of json) {
            if (digest) {
                const imageDigest: ImageName = new ImageName(digest);
                if (imageDigest &&
                    imageDigest.repository === imageName.repository &&
                    imageDigest.registry === imageName.registry) {
                        return imageDigest.digest;
                    }
            }
        }

        return "";
    }
}