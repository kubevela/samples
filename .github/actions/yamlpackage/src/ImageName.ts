export class ImageName {
    registry: string;
    repository: string;
    tag: string;
    digest: string;

    constructor(fullName: string) {
        this.registry = "";
        this.repository = "";
        this.tag = "";
        this.digest = "";
        if (fullName) {
            const digestSeparatorIndex: number = fullName.lastIndexOf("@");
            if (digestSeparatorIndex > 0) {
                this.digest = fullName.substring(digestSeparatorIndex + 1);
                fullName = fullName.substring(0, digestSeparatorIndex);
            }
            const registrySeparatorIndex: number = fullName.indexOf("/");
            if (registrySeparatorIndex > 0) {
                this.registry = fullName.substring(0, registrySeparatorIndex);
                fullName = fullName.substring(registrySeparatorIndex + 1);
            }
            const tagSeparatorIndex: number = fullName.indexOf(":");
            if (tagSeparatorIndex > 0) {
                this.repository = fullName.substring(0, tagSeparatorIndex);
                fullName = fullName.substring(tagSeparatorIndex + 1);
                this.tag = fullName;
            } else {
                this.repository = fullName;
            }
        }
    }

    public toString(): string {
        let result: string = "";
        if (this.registry) {
            result = this.registry + "/";
        }
        result = result + this.repository;
        if (this.tag) {
            result = result + ":" + this.tag;
        }
        if (this.digest) {
            result = result + "@" + this.digest;
        }
        return result;
    }
}