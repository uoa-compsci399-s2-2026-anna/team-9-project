class EventBus extends EventTarget {
    publish(name, detail) {
        this.dispatchEvent(new CustomEvent(name, { detail }));
    }

    subscribe(name, handler) {
        this.addEventListener(name, handler);
        return () => this.removeEventListener(name, handler);
    }
}

export const bus = new EventBus();