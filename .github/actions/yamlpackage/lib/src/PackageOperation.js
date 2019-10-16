"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const imageNameUpdater = __importStar(require("./ImageNameUpdater"));
class PackageOperation {
    constructor(settings) {
        this.settings = settings;
    }
    package() {
        return __awaiter(this, void 0, void 0, function* () {
            PackageOperation.makeDirectoryIfNecessary(this.settings.outputDirectory);
            for (let filePath of this.settings.manifests) {
                PackageOperation.copyManifestFile(filePath, this.settings.outputDirectory, this.settings.images);
            }
        });
    }
    static copyManifestFile(filePath, outputDirectory, images) {
        const outputFilePath = PackageOperation.getOutputFilePath(filePath, outputDirectory);
        const fileExtension = path.extname(filePath);
        const isYaml = !fileExtension || fileExtension.toLowerCase() === ".yaml" || fileExtension.toLowerCase() === ".yml";
        if (fileExtension && isYaml && images && images.length > 0) {
            const fileContents = fs.readFileSync(filePath).toString();
            if (fileContents) {
                const updatedContents = imageNameUpdater.updateYamlContents(fileContents, images);
                fs.writeFileSync(outputFilePath, updatedContents);
                return;
            }
        }
        fs.copyFileSync(filePath, outputFilePath);
    }
    static getOutputFilePath(sourceFilePath, outputDirectory) {
        const fileName = path.basename(sourceFilePath);
        const fileExtension = path.extname(sourceFilePath);
        const fileNameWithoutExtension = fileName.substring(0, fileName.length - fileExtension.length);
        let outputFilePath = path.join(outputDirectory, fileName);
        let counter = 1;
        while (fs.existsSync(outputFilePath)) {
            const newFileName = fileNameWithoutExtension + counter + fileExtension;
            outputFilePath = path.join(outputDirectory, newFileName);
            counter++;
        }
        return outputFilePath;
    }
    static makeDirectoryIfNecessary(directoryPath) {
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
        }
        else {
            const dirStat = fs.statSync(directoryPath);
            if (!dirStat.isDirectory) {
                throw new Error(`The provided path '${directoryPath}' does not refer to a directory.`);
            }
        }
    }
}
exports.PackageOperation = PackageOperation;
