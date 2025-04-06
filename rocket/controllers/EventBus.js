class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    
    subscribe(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType).add(callback);
        
        // Retourner une fonction pour se désabonner facilement
        return () => this.unsubscribe(eventType, callback);
    }
    
    unsubscribe(eventType, callback) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).delete(callback);
        }
    }
    
    emit(eventType, data) {
        if (this.listeners.has(eventType)) {
            for (const callback of this.listeners.get(eventType)) {
                callback(data);
            }
        }
    }
    
    clear() {
        this.listeners.clear();
    }
} 