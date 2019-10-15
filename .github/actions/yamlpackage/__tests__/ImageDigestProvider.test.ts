import { ImageDigestProvider } from "../src/ImageDigestProvider";
import { ICommandLine, CommandLineResult } from "../src/CommandLine";
import { ImageName } from "../src/ImageName";

export class MockDockerInspectCommandLine implements ICommandLine {
    constructor(private readonly success: boolean,
                private readonly stdOut: string,
                private readonly stdErr: string) {
    }

    public async exec(command: string, args: string[]): Promise<CommandLineResult> {
        return new CommandLineResult(this.success, this.stdOut, this.stdErr);
    }
}

describe("ImageDigestProvider tests", () => {
    it("base case", async () => {
        const stdOutJson: string = JSON.stringify(["contoso.azurecr.io/helloworld@sha256:abcdefg"]);
        const mockCommandLine: ICommandLine = new MockDockerInspectCommandLine(true, stdOutJson, "");
        const imageDigestProvider: ImageDigestProvider = new ImageDigestProvider(mockCommandLine);
        const digest: string = await imageDigestProvider.getDigest(new ImageName("contoso.azurecr.io/helloworld:latest"));
        expect(digest).toBe("sha256:abcdefg");
    });
    it("multiple digests", async () => {
        const stdOutJson: string = JSON.stringify(
            ["other/helloworld@sha256:defghijk", "contoso.azurecr.io/helloworld@sha256:abcdefg"]);
        const mockCommandLine: ICommandLine = new MockDockerInspectCommandLine(true, stdOutJson, "");
        const imageDigestProvider: ImageDigestProvider = new ImageDigestProvider(mockCommandLine);
        const digest: string = await imageDigestProvider.getDigest(new ImageName("contoso.azurecr.io/helloworld:latest"));
        expect(digest).toBe("sha256:abcdefg");
    });
    it("no matching registry", async () => {
        const stdOutJson: string = JSON.stringify(
            ["other/helloworld@sha256:defghijk", "contoso/helloworld@sha256:abcdefg"]);
        const mockCommandLine: ICommandLine = new MockDockerInspectCommandLine(true, stdOutJson, "");
        const imageDigestProvider: ImageDigestProvider = new ImageDigestProvider(mockCommandLine);
        const digest: string = await imageDigestProvider.getDigest(new ImageName("contoso.azurecr.io/helloworld:latest"));
        expect(digest).toBe("");
    });
    it("no matching repository", async () => {
        const stdOutJson: string = JSON.stringify(
            ["other/helloworld@sha256:defghijk", "contoso/helloworld@sha256:abcdefg"]);
        const mockCommandLine: ICommandLine = new MockDockerInspectCommandLine(true, stdOutJson, "");
        const imageDigestProvider: ImageDigestProvider = new ImageDigestProvider(mockCommandLine);
        const digest: string = await imageDigestProvider.getDigest(new ImageName("contoso/helloworld2:latest"));
        expect(digest).toBe("");
    });
    it("CLI failure", async () => {
        const mockCommandLine: ICommandLine = new MockDockerInspectCommandLine(false, "", "'docker' is not recognized");
        const imageDigestProvider: ImageDigestProvider = new ImageDigestProvider(mockCommandLine);
        const digest: string = await imageDigestProvider.getDigest(new ImageName("contoso/helloworld2:latest"));
        expect(digest).toBe("");
    });
});