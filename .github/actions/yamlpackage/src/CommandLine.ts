import * as actionsExec from "@actions/exec";
import { ExecOptions } from "@actions/exec/lib/interfaces";

export class CommandLineResult {
    constructor (public readonly success: boolean,
                 public readonly stdOut: string,
                 public readonly stdErr: string) {
    }
}

export interface ICommandLine {
    exec(command: string, args: string[]): Promise<CommandLineResult>;
}

export class CommandLine implements ICommandLine {
    public async exec(command: string, args: string[]): Promise<CommandLineResult> {
        let stdOut: string = "";
        let stdErr: string = "";

        const options: ExecOptions = {};
        options.listeners = {
            stdout: (data: Buffer) => {
                stdOut += data.toString();
            },
            stderr: (data: Buffer) => {
                stdErr += data.toString();
            }
        };

        const returnCode: number = await actionsExec.exec(command, args, options);
        return new CommandLineResult(returnCode === 0, stdOut, stdErr);
    }
}