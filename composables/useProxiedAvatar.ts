export function useProxiedAvatar(originalUrl: Ref<string | undefined>) {
    const proxiedUrl = computed(() => {
        if (!originalUrl.value) return undefined;

        // Proxying Google avatars can return 500s in some hosted environments.
        // Use the direct URL; Google avatar responses allow CORS for images.
        return originalUrl.value;
    });

    return {
        proxiedUrl,
    };
}
