"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ImageName_1 = require("./ImageName");
class ImageDigestProvider {
    constructor(commandLine) {
        this.commandLine = commandLine;
    }
    getDigest(imageName) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ["inspect", imageName.toString(), "--format", "\"{{ json .RepoDigests }}\""];
            const result = yield this.commandLine.exec("docker", args);
            if (!result.success || !result.stdOut) {
                return "";
            }
            // trim quotation marks from beginning and end of output
            let stdOut = result.stdOut.trim();
            if (stdOut.length > 2) {
                if (stdOut.endsWith("\"")) {
                    stdOut = stdOut.substring(0, stdOut.length - 1);
                }
                if (stdOut.startsWith("\"")) {
                    stdOut = stdOut.substring(1);
                }
            }
            const json = JSON.parse(stdOut);
            if (!json) {
                return "";
            }
            for (let digest of json) {
                if (digest) {
                    const imageDigest = new ImageName_1.ImageName(digest);
                    if (imageDigest &&
                        imageDigest.repository === imageName.repository &&
                        imageDigest.registry === imageName.registry) {
                        return imageDigest.digest;
                    }
                }
            }
            return "";
        });
    }
}
exports.ImageDigestProvider = ImageDigestProvider;
