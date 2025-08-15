import { useCallback } from 'react';

/**
 * Custom hook for handling Live2D model motions.
 */
export const useLive2DMotion = () => {
    /**
     * Start a motion on the Live2D model.
     * @param group - The motion group name.
     * @param index - The index of the motion within the group.
     * @param priority - The priority of the motion.
     */
    const startMotion = useCallback((
        group: string,
        index: number,
        priority: number,
    ) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lappAdapter = (window as any).getLAppAdapter?.();
        if (!lappAdapter) {
            console.warn('LAppAdapter not available, cannot start motion.');
            return;
        }

        try {
            lappAdapter.startMotion(group, index, priority);
        } catch (error) {
            console.error(`Failed to start motion: ${group}_${index}`, error);
        }
    }, []);

    return {
        startMotion,
    };
};