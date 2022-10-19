import { Plugin } from '@/plugin';
import { Context } from '@/events';
export declare class Listen<T extends keyof Context = any> {
    private event_name;
    plugin: Plugin;
    func?: (event: Context[T]) => any;
    constructor(event_name: string, plugin: Plugin);
    run(event: any): void;
    trigger(callback: (event: Context[T]) => any): this;
}
