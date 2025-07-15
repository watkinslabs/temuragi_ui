// src/utils/registry.js
export const initializeRegistry = () => {
    const registry = {
        pages: new Map(),
        components: new Map(),
        layouts: new Map(),
        
        register_page(name, module) {
            this.pages.set(name, module);
            console.log(`Page registered: ${name}`);
            
            // Dispatch event for any listeners
            window.dispatchEvent(new CustomEvent('module_registered', {
                detail: { name, type: 'page', module }
            }));
        },
        
        register_component(name, module) {
            this.components.set(name, module);
            console.log(`Component registered: ${name}`);
            
            window.dispatchEvent(new CustomEvent('module_registered', {
                detail: { name, type: 'component', module }
            }));
        },
        
        register_layout(name, module) {
            this.layouts.set(name, module);
            console.log(`Layout registered: ${name}`);
            
            window.dispatchEvent(new CustomEvent('module_registered', {
                detail: { name, type: 'layout', module }
            }));
        },
        
        get_page(name) {
            return this.pages.get(name);
        },
        
        get_component(name) {
            return this.components.get(name);
        },
        
        get_layout(name) {
            return this.layouts.get(name);
        },
        
        // Helper to check if something is already loaded
        is_loaded(type, name) {
            switch(type) {
                case 'page': return this.pages.has(name);
                case 'component': return this.components.has(name);
                case 'layout': return this.layouts.has(name);
                default: return false;
            }
        }
    };
    
    window.app_registry = registry;
    
    // Debug helper
    window.list_registry = () => {
        console.log('=== REGISTRY ===');
        console.log('Pages:', Array.from(registry.pages.keys()));
        console.log('Components:', Array.from(registry.components.keys()));
        console.log('Layouts:', Array.from(registry.layouts.keys()));
    };
};