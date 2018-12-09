import { ChildProcess } from 'child_process';

export function init(path: string): Promise<any>
export function initSync(path: string)

export function node(path: string, opts: object): ChildProcess

export function lite(target: string, path: string, opts: object): ChildProcess

export function version(): string

export function genValidator(): string