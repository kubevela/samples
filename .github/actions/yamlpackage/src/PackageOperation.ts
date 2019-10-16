import * as fs from "fs";
import * as path from "path";
import * as imageNameUpdater from "./ImageNameUpdater";
import { ImageName } from "./ImageName";
import { PackageSettings } from "./PackageSettings";

export class PackageOperation {
    constructor(readonly settings: PackageSettings) {
    }

    public async package(): Promise<void> {
        PackageOperation.makeDirectoryIfNecessary(this.settings.outputDirectory);
        for (let filePath of this.settings.manifests) {
            PackageOperation.copyManifestFile(filePath, this.settings.outputDirectory, this.settings.images);
        }
    }

    private static copyManifestFile(filePath: string, outputDirectory: string, images: ImageName[]): void {
        const outputFilePath: string = PackageOperation.getOutputFilePath(filePath, outputDirectory);
        const fileExtension: string = path.extname(filePath);
        const isYaml: boolean = !fileExtension || fileExtension.toLowerCase() === ".yaml" || fileExtension.toLowerCase() === ".yml";
        if (fileExtension && isYaml && images && images.length > 0) {
            const fileContents: string = fs.readFileSync(filePath).toString();
            if (fileContents) {
                const updatedContents: string = imageNameUpdater.updateYamlContents(fileContents, images);
                fs.writeFileSync(outputFilePath, updatedContents);
                return;
            }
        }

        fs.copyFileSync(filePath, outputFilePath);
    }

    private static getOutputFilePath(sourceFilePath: string, outputDirectory: string): string {
        const fileName: string = path.basename(sourceFilePath);
        const fileExtension: string = path.extname(sourceFilePath);
        const fileNameWithoutExtension: string = fileName.substring(0, fileName.length - fileExtension.length);
        let outputFilePath: string = path.join(outputDirectory, fileName);
        let counter: number = 1;
        while (fs.existsSync(outputFilePath)) {
            const newFileName: string = fileNameWithoutExtension + counter + fileExtension;
            outputFilePath = path.join(outputDirectory, newFileName);
            counter++;
        }
        return outputFilePath;
    }

    private static makeDirectoryIfNecessary(directoryPath: string): void {
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
        } else {
            const dirStat: fs.Stats = fs.statSync(directoryPath);
            if (!dirStat.isDirectory) {
                throw new Error(`The provided path '${directoryPath}' does not refer to a directory.`);
            }
        }
    }
}