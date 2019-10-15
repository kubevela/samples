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
const ImageDigestProvider_1 = require("../src/ImageDigestProvider");
const CommandLine_1 = require("../src/CommandLine");
const ImageName_1 = require("../src/ImageName");
class MockDockerInspectCommandLine {
    constructor(success, stdOut, stdErr) {
        this.success = success;
        this.stdOut = stdOut;
        this.stdErr = stdErr;
    }
    exec(command, args) {
        return __awaiter(this, void 0, void 0, function* () {
            return new CommandLine_1.CommandLineResult(this.success, this.stdOut, this.stdErr);
        });
    }
}
exports.MockDockerInspectCommandLine = MockDockerInspectCommandLine;
describe("ImageDigestProvider tests", () => {
    it("base case", () => __awaiter(this, void 0, void 0, function* () {
        const stdOutJson = JSON.stringify(["contoso.azurecr.io/helloworld@sha256:abcdefg"]);
        const mockCommandLine = new MockDockerInspectCommandLine(true, stdOutJson, "");
        const imageDigestProvider = new ImageDigestProvider_1.ImageDigestProvider(mockCommandLine);
        const digest = yield imageDigestProvider.getDigest(new ImageName_1.ImageName("contoso.azurecr.io/helloworld:latest"));
        expect(digest).toBe("sha256:abcdefg");
    }));
    it("multiple digests", () => __awaiter(this, void 0, void 0, function* () {
        const stdOutJson = JSON.stringify(["other/helloworld@sha256:defghijk", "contoso.azurecr.io/helloworld@sha256:abcdefg"]);
        const mockCommandLine = new MockDockerInspectCommandLine(true, stdOutJson, "");
        const imageDigestProvider = new ImageDigestProvider_1.ImageDigestProvider(mockCommandLine);
        const digest = yield imageDigestProvider.getDigest(new ImageName_1.ImageName("contoso.azurecr.io/helloworld:latest"));
        expect(digest).toBe("sha256:abcdefg");
    }));
    it("no matching registry", () => __awaiter(this, void 0, void 0, function* () {
        const stdOutJson = JSON.stringify(["other/helloworld@sha256:defghijk", "contoso/helloworld@sha256:abcdefg"]);
        const mockCommandLine = new MockDockerInspectCommandLine(true, stdOutJson, "");
        const imageDigestProvider = new ImageDigestProvider_1.ImageDigestProvider(mockCommandLine);
        const digest = yield imageDigestProvider.getDigest(new ImageName_1.ImageName("contoso.azurecr.io/helloworld:latest"));
        expect(digest).toBe("");
    }));
    it("no matching repository", () => __awaiter(this, void 0, void 0, function* () {
        const stdOutJson = JSON.stringify(["other/helloworld@sha256:defghijk", "contoso/helloworld@sha256:abcdefg"]);
        const mockCommandLine = new MockDockerInspectCommandLine(true, stdOutJson, "");
        const imageDigestProvider = new ImageDigestProvider_1.ImageDigestProvider(mockCommandLine);
        const digest = yield imageDigestProvider.getDigest(new ImageName_1.ImageName("contoso/helloworld2:latest"));
        expect(digest).toBe("");
    }));
    it("CLI failure", () => __awaiter(this, void 0, void 0, function* () {
        const mockCommandLine = new MockDockerInspectCommandLine(false, "", "'docker' is not recognized");
        const imageDigestProvider = new ImageDigestProvider_1.ImageDigestProvider(mockCommandLine);
        const digest = yield imageDigestProvider.getDigest(new ImageName_1.ImageName("contoso/helloworld2:latest"));
        expect(digest).toBe("");
    }));
});
