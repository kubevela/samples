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
const PackageSettings_1 = require("../src/PackageSettings");
const ImageName_1 = require("../src/ImageName");
const ImageDigestProvider_test_1 = require("./ImageDigestProvider.test");
const ImageDigestProvider_1 = require("../src/ImageDigestProvider");
describe("PackageSettings constructor tests", () => {
    it("base case", () => __awaiter(this, void 0, void 0, function* () {
        verifyConstructor("C:\\outdir", "c:\\file1.yaml\r\nc:\\file2.yaml", "contoso.azurecr.io/helloworld:v1\nhelloworld", ["c:\\file1.yaml", "c:\\file2.yaml"], [new ImageName_1.ImageName("contoso.azurecr.io/helloworld:v1"), new ImageName_1.ImageName("helloworld")]);
    }));
    it("missing outputDirectory", () => __awaiter(this, void 0, void 0, function* () {
        verifyConstructorError("", "c:\\file1.yaml\r\nc:\\file2.yaml", "contoso.azurecr.io/helloworld:v1\nhelloworld", "No outputDirectory supplied to package.");
    }));
    it("missing manifests", () => __awaiter(this, void 0, void 0, function* () {
        verifyConstructorError("C:\\outdir", "", "contoso.azurecr.io/helloworld:v1\nhelloworld", "No manifests supplied to package.");
    }));
});
describe("PackageSettings updateDigests tests", () => {
    it("base case", () => __awaiter(this, void 0, void 0, function* () {
        yield verifyUpdateDigests("C:\\outdir", "c:\\file1.yaml\r\nc:\\file2.yaml", "aa/bb:cc\ndd/ee:ff", ["dd/ee@sha256:abcd", "aa/bb@sha256:123"], [new ImageName_1.ImageName("aa/bb:cc@sha256:123"), new ImageName_1.ImageName("dd/ee:ff@sha256:abcd")]);
    }));
    it("no matching repositories", () => __awaiter(this, void 0, void 0, function* () {
        yield verifyUpdateDigests("C:\\outdir", "c:\\file1.yaml\r\nc:\\file2.yaml", "aa/bb:cc\ndd/ee:ff", ["dd/gg@sha256:abcd", "aa/hh@sha256:123"], [new ImageName_1.ImageName("aa/bb:cc"), new ImageName_1.ImageName("dd/ee:ff")]);
    }));
    it("no matching registries", () => __awaiter(this, void 0, void 0, function* () {
        yield verifyUpdateDigests("C:\\outdir", "c:\\file1.yaml\r\nc:\\file2.yaml", "aa/bb:cc\ndd/ee:ff", ["aa/ee@sha256:abcd", "dd/bb@sha256:123"], [new ImageName_1.ImageName("aa/bb:cc"), new ImageName_1.ImageName("dd/ee:ff")]);
    }));
    it("no digests", () => __awaiter(this, void 0, void 0, function* () {
        yield verifyUpdateDigests("C:\\outdir", "c:\\file1.yaml\r\nc:\\file2.yaml", "aa/bb:cc\ndd/ee:ff", [], [new ImageName_1.ImageName("aa/bb:cc"), new ImageName_1.ImageName("dd/ee:ff")]);
    }));
    it("one matching", () => __awaiter(this, void 0, void 0, function* () {
        yield verifyUpdateDigests("C:\\outdir", "c:\\file1.yaml\r\nc:\\file2.yaml", "aa/bb:cc\ndd/ee:ff", ["dd/ee@sha256:abcd", "notmatching/bb@sha256:123"], [new ImageName_1.ImageName("aa/bb:cc"), new ImageName_1.ImageName("dd/ee:ff@sha256:abcd")]);
    }));
});
function verifyUpdateDigests(outputDirectory, manifests, images, digests, resultImages) {
    return __awaiter(this, void 0, void 0, function* () {
        const settings = new PackageSettings_1.PackageSettings((name) => getInput(name, outputDirectory, manifests, images));
        const stdOutJson = JSON.stringify(digests);
        const commandLine = new ImageDigestProvider_test_1.MockDockerInspectCommandLine(!!digests, stdOutJson, "");
        const imageDigestProvider = new ImageDigestProvider_1.ImageDigestProvider(commandLine);
        yield settings.updateDigests(imageDigestProvider);
        expect(settings.images).toMatchObject(resultImages);
    });
}
function verifyConstructor(outputDirectory, manifests, images, resultManifests, resultImages) {
    const settings = new PackageSettings_1.PackageSettings((name) => getInput(name, outputDirectory, manifests, images));
    expect(settings.outputDirectory).toBe(outputDirectory);
    expect(settings.manifests).toMatchObject(resultManifests);
    expect(settings.images).toMatchObject(resultImages);
}
function verifyConstructorError(outputDirectory, manifests, images, expectedError) {
    try {
        const actionInput = new PackageSettings_1.PackageSettings((name) => getInput(name, outputDirectory, manifests, images));
        fail("An error was expected, but no error was caught.");
    }
    catch (error) {
        if (error instanceof Error) {
            expect(error.message).toBe(expectedError);
        }
        else {
            fail("An error was expected, but the caught error was not of type Error.");
        }
    }
}
function getInput(name, outputDirectory, manifests, images) {
    if (name === "outputDirectory") {
        return outputDirectory;
    }
    else if (name === "manifests") {
        return manifests;
    }
    else if (name === "images") {
        return images;
    }
    else {
        throw new Error("Unexpected input requested.");
    }
}
