import { ImageName } from "./ImageName";
import { IImageDigestProvider } from "./ImageDigestProvider";

export class PackageSettings {
    outputDirectory: string;
    manifests: string[];
    images: ImageName[];

    constructor(getInput: (inputName: string) => string) {
        this.outputDirectory = getInput("outputDirectory");
        if (!this.outputDirectory) {
            throw new Error("No outputDirectory supplied to package.");
        }
        const manifestLines: string = getInput("manifests");
        if (!manifestLines) {
            throw new Error("No manifests supplied to package.");
        }
        this.manifests = PackageSettings.splitLines(manifestLines);

        this.images = [];
        const imageLines: string = getInput("images");
        if (imageLines) {
            const images: string[] = PackageSettings.splitLines(imageLines);
            for (let image of images) {
                this.images.push(new ImageName(image));
            }
        }
    }

    public async updateDigests(imageDigestProvider: IImageDigestProvider): Promise<void> {
        if (!this.images || !imageDigestProvider) {
            return;
        }

        for (let imageName of this.images) {
            const digest: string = await imageDigestProvider.getDigest(imageName);
            if (digest) {
                imageName.digest = digest;
            }
        }
    }

    private static splitLines(linesToSplit: string): string[] {
        if (!linesToSplit) {
            return [];
        }
        const lines: string[] = linesToSplit.split("\n");
        const result: string[] = [];
        for (let line of lines) {
            line = line.trim();
            if (line) {
                result.push(line);
            }
        }
        return result;
    }
}