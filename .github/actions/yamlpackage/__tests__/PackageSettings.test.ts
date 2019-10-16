import { PackageSettings } from "../src/PackageSettings";
import { ImageName } from "../src/ImageName";
import { ICommandLine } from "../src/CommandLine";
import { MockDockerInspectCommandLine } from "./ImageDigestProvider.test";
import { IImageDigestProvider, ImageDigestProvider } from "../src/ImageDigestProvider";

describe("PackageSettings constructor tests", () => {
    it("base case", async () => {
        verifyConstructor("C:\\outdir", "c:\\file1.yaml\r\nc:\\file2.yaml", "contoso.azurecr.io/helloworld:v1\nhelloworld",
        ["c:\\file1.yaml", "c:\\file2.yaml"], [new ImageName("contoso.azurecr.io/helloworld:v1"), new ImageName("helloworld")]);
    });
    it("missing outputDirectory", async () => {
        verifyConstructorError("", "c:\\file1.yaml\r\nc:\\file2.yaml", "contoso.azurecr.io/helloworld:v1\nhelloworld",
        "No outputDirectory supplied to package.");
    });
    it("missing manifests", async () => {
        verifyConstructorError("C:\\outdir", "", "contoso.azurecr.io/helloworld:v1\nhelloworld",
        "No manifests supplied to package.");
    });
});

describe("PackageSettings updateDigests tests", () => {
    it("base case", async () => {
        await verifyUpdateDigests("C:\\outdir", "c:\\file1.yaml\r\nc:\\file2.yaml", "aa/bb:cc\ndd/ee:ff",
        ["dd/ee@sha256:abcd", "aa/bb@sha256:123"],
        [new ImageName("aa/bb:cc@sha256:123"), new ImageName("dd/ee:ff@sha256:abcd")]);
    });
    it("no matching repositories", async () => {
        await verifyUpdateDigests("C:\\outdir", "c:\\file1.yaml\r\nc:\\file2.yaml", "aa/bb:cc\ndd/ee:ff",
        ["dd/gg@sha256:abcd", "aa/hh@sha256:123"],
        [new ImageName("aa/bb:cc"), new ImageName("dd/ee:ff")]);
    });
    it("no matching registries", async () => {
        await verifyUpdateDigests("C:\\outdir", "c:\\file1.yaml\r\nc:\\file2.yaml", "aa/bb:cc\ndd/ee:ff",
        ["aa/ee@sha256:abcd", "dd/bb@sha256:123"],
        [new ImageName("aa/bb:cc"), new ImageName("dd/ee:ff")]);
    });
    it("no digests", async () => {
        await verifyUpdateDigests("C:\\outdir", "c:\\file1.yaml\r\nc:\\file2.yaml", "aa/bb:cc\ndd/ee:ff",
        [],
        [new ImageName("aa/bb:cc"), new ImageName("dd/ee:ff")]);
    });
    it("one matching", async () => {
        await verifyUpdateDigests("C:\\outdir", "c:\\file1.yaml\r\nc:\\file2.yaml", "aa/bb:cc\ndd/ee:ff",
        ["dd/ee@sha256:abcd", "notmatching/bb@sha256:123"],
        [new ImageName("aa/bb:cc"), new ImageName("dd/ee:ff@sha256:abcd")]);
    });
});

async function verifyUpdateDigests(outputDirectory: string, manifests: string, images: string, digests: string[],
                                   resultImages: ImageName[]): Promise<void> {
    const settings: PackageSettings = new PackageSettings((name: string) => getInput(name, outputDirectory, manifests, images));
    const stdOutJson: string = JSON.stringify(digests);
    const commandLine: ICommandLine = new MockDockerInspectCommandLine(!!digests, stdOutJson, "");
    const imageDigestProvider: IImageDigestProvider = new ImageDigestProvider(commandLine);
    await settings.updateDigests(imageDigestProvider);
    expect(settings.images).toMatchObject(resultImages);
}

function verifyConstructor(outputDirectory: string, manifests: string, images: string, resultManifests: string[],
                           resultImages: ImageName[]): void {
    const settings: PackageSettings = new PackageSettings((name: string) => getInput(name, outputDirectory, manifests, images));
    expect(settings.outputDirectory).toBe(outputDirectory);
    expect(settings.manifests).toMatchObject(resultManifests);
    expect(settings.images).toMatchObject(resultImages);
}

function verifyConstructorError(outputDirectory: string, manifests: string, images: string, expectedError: string): void {
    try {
        const actionInput: PackageSettings = new PackageSettings((name: string) => getInput(name, outputDirectory, manifests, images));
        fail("An error was expected, but no error was caught.");
    } catch (error) {
        if (error instanceof Error) {
            expect(error.message).toBe(expectedError);
        } else {
            fail("An error was expected, but the caught error was not of type Error.");
        }
    }
}

function getInput(name: string, outputDirectory: string, manifests: string, images: string): string {
    if (name === "outputDirectory") {
        return outputDirectory;
    } else if (name === "manifests") {
        return manifests;
    } else if (name === "images") {
        return images;
    } else {
        throw new Error("Unexpected input requested.");
    }
}