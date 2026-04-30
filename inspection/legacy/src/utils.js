/**
 * Intelligent Image Compression Utility
 * Resizes and compresses images using the Canvas API.
 */
const ImageProcessor = {
    /**
     * Compresses a file into a high-quality JPEG blob.
     * @param {File} file The original file from input[type="file"]
     * @param {Object} options { maxWidth, maxHeight, quality }
     * @returns {Promise<File>} A Promise that resolves to the compressed File object
     */
    async compress(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.7 } = {}) {
        // Only compress images
        if (!file.type.startsWith('image/')) return file;
        
        // Don't compress small images (e.g. icons, < 200KB)
        if (file.size < 200 * 1024) return file;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                
                img.onload = () => {
                    // Calculate new dimensions while keeping aspect ratio
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= (maxWidth / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= (maxHeight / height);
                            height = maxHeight;
                        }
                    }

                    // Create canvas and draw image
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to Blob (JPEG format for best compression)
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error("Compression failed: Canvas empty"));
                            return;
                        }
                        
                        // Create a new File from the blob
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        
                        // Only return compressed if it's actually smaller
                        resolve(compressedFile.size < file.size ? compressedFile : file);
                    }, 'image/jpeg', quality);
                };
                
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    }
};

window.ImageProcessor = ImageProcessor;

const RoleDirectory = {
    routes: {
        super_admin: 'superadmin.html',
        admin: 'admin.html',
        nccg_officer: 'nccg.html',
        finance_manager: 'finance.html',
        inspector: 'index.html'
    },

    labels: {
        super_admin: 'Super Admin',
        admin: 'Admin',
        nccg_officer: 'NCCG Officer',
        finance_manager: 'Finance Manager',
        inspector: 'PHO'
    },

    getHomeRoute(role) {
        return this.routes[role] || 'index.html';
    },

    getLabel(role) {
        return this.labels[role] || role || 'User';
    }
};

window.RoleDirectory = RoleDirectory;

const UiHelpers = {
    initTabs({ tabs, tabContents, initialTab, titles = {}, titleElement, onSwitch, activateInitial = false }) {
        const tabList = Array.from(tabs || []);
        const contentList = Array.from(tabContents || []);
        let activeTab = initialTab || tabList.find(tab => tab.classList.contains('active'))?.dataset.tab;

        function switchTab(tabId) {
            activeTab = tabId;
            tabList.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabId));
            contentList.forEach(content => content.classList.toggle('active', content.id === tabId));

            if (titleElement && titles[tabId]) {
                titleElement.textContent = titles[tabId];
            }

            if (typeof onSwitch === 'function') {
                onSwitch(tabId);
            }
        }

        tabList.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        if (activateInitial && activeTab) {
            switchTab(activeTab);
        }

        return { switchTab, getActiveTab: () => activeTab };
    },

    renderPagination(containerOrId, { page = 0, totalPages = 0, onPrev, onNext, label } = {}) {
        const container = typeof containerOrId === 'string'
            ? document.getElementById(containerOrId)
            : containerOrId;

        if (!container) return;

        if (!totalPages || totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:flex-end; gap:0.75rem; flex-wrap:wrap;">
                <span style="font-size:0.85rem; color:#64748b;">
                    ${label || 'Page'} ${page + 1} of ${totalPages}
                </span>
                <button type="button" data-page-action="prev" class="btn-outline" style="padding:0.4rem 0.9rem;" ${page <= 0 ? 'disabled' : ''}>Previous</button>
                <button type="button" data-page-action="next" class="btn-primary" style="padding:0.4rem 0.9rem;" ${page >= totalPages - 1 ? 'disabled' : ''}>Next</button>
            </div>
        `;

        container.querySelector('[data-page-action="prev"]')?.addEventListener('click', () => {
            if (typeof onPrev === 'function' && page > 0) onPrev();
        });

        container.querySelector('[data-page-action="next"]')?.addEventListener('click', () => {
            if (typeof onNext === 'function' && page < totalPages - 1) onNext();
        });
    }
};

window.UiHelpers = UiHelpers;

/**
 * Activity Tracker Utility
 * Records system events to the activity log.
 */
const ActivityTracker = {
    /**
     * Records an action in the system logs.
     * @param {string} actionType The type of action (e.g., 'inspection_start')
     * @param {string} description Human-readable description
     * @param {Object} metadata Extra context (business name, zone, etc.)
     */
    async log(actionType, description, metadata = {}) {
        // Only log if we have a profile (user is logged in)
        if (!window.CURRENT_PROFILE) return;

        // Reuse the auth client that already holds the active session
        // Fall back to creating one if _authSupabase isn't available yet
        const client = window._authSupabase ||
            window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

        try {
            await client
                .from('system_activity_logs')
                .insert({
                    user_id:     window.CURRENT_USER?.id,
                    user_name:   window.CURRENT_PROFILE.full_name,
                    action_type: actionType,
                    description: description,
                    zone:        window.CURRENT_PROFILE.zone || 'Global',
                    metadata:    metadata
                });
        } catch (err) {
            // Never let logging crash the app
            console.warn('Activity log failed silently:', err.message);
        }
    }
};

window.ActivityTracker = ActivityTracker;
