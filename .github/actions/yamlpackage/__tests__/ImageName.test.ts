import { ImageName } from "../src/ImageName";

describe("ImageName parsing tests", () => {
    it("contoso.azurecr.io/helloworld:latest", async () => {
        checkImageName("contoso.azurecr.io/helloworld:latest", "helloworld", "contoso.azurecr.io", "latest", "");
    });
    it("helloworld", async () => {
        checkImageName("helloworld", "helloworld", "", "", "");
    });
    it("helloworld:v101", async () => {
        checkImageName("helloworld:v101", "helloworld", "", "v101", "");
    });
    it("acr/helloworld", async () => {
        checkImageName("acr/helloworld", "helloworld", "acr", "", "");
    });
    it("acr/helloworld:v1@sha256:3990808930981", async () => {
        checkImageName("acr/helloworld", "helloworld", "acr", "", "sha256:3990808930981");
    });
});

function checkImageName(testName: string, repository: string, registry?: string, tag?: string, digest?: string): void {
    const image: ImageName = new ImageName(testName);
    expect(image.registry).toBe(registry);
    expect(image.repository).toBe(repository);
    expect(image.tag).toBe(tag);
    expect(image.toString()).toBe(testName);
}