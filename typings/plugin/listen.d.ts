import { Plugin } from '../plugin';
import { Event, EventName } from '../events';
export declare class Listen<K extends EventName = any> {
    private event_name;
    plugin: Plugin;
    func?: (event: Event<K>) => any;
    constructor(event_name: string, plugin: Plugin);
    run(event: Event<K>): void;
    trigger(callback: (event: Event<K>) => any): this;
}
