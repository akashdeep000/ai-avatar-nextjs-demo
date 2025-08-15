import { useCallback } from 'react';
import type { ModelInfo } from '../state/types';
/**
 * Custom hook for handling Live2D model expressions
 */
export const useLive2DExpression = () => {
    /**
     * Set expression for Live2D model
     * @param expressionValue - Expression name (string) or index (number)
     * @param lappAdapter - LAppAdapter instance
     * @param logMessage - Optional message to log on success
     */
    const setExpression = useCallback((
        expressionValue: string | number,
        logMessage?: string,
    ) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lappAdapter = (window as any).getLAppAdapter?.();
        if (!lappAdapter) {
            console.warn('LAppAdapter not available, cannot set expression.');
            return;
        }

        try {
            if (typeof expressionValue === 'string') {
                // Set expression by name
                lappAdapter.setExpression(expressionValue);
            } else if (typeof expressionValue === 'number') {
                // Set expression by index
                const expressionName = lappAdapter.getExpressionName(expressionValue);
                if (expressionName) {
                    lappAdapter.setExpression(expressionName);
                }
            }
            if (logMessage) {
                console.log(logMessage);
            }
        } catch (error) {
            console.error('Failed to set expression:', error);
        }
    }, []);

    /**
     * Reset expression to default
     * @param lappAdapter - LAppAdapter instance
     * @param modelInfo - Current model information
     */
    const resetExpression = useCallback((
        modelInfo?: ModelInfo,
    ) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lappAdapter = (window as any).getLAppAdapter?.();
        if (!lappAdapter) {
            console.warn('LAppAdapter not available, cannot reset expression.');
            return;
        }

        try {
            // Check if model is loaded and has expressions
            const model = lappAdapter.getModel();
            if (!model || !model._modelSetting) {
                console.log('Model or model settings not loaded yet, skipping expression reset');
                return;
            }

            // If model has a default emotion defined, use it
            if (modelInfo?.defaultEmotion !== undefined) {
                setExpression(
                    modelInfo.defaultEmotion,
                    `Reset expression to default: ${modelInfo.defaultEmotion}`,
                );
            } else {
                // Check if model has any expressions before trying to get the first one
                const expressionCount = lappAdapter.getExpressionCount();
                if (expressionCount > 0) {
                    const defaultExpressionName = lappAdapter.getExpressionName(0);
                    if (defaultExpressionName) {
                        setExpression(
                            defaultExpressionName,
                        );
                    }
                }
            }
        } catch (error) {
            console.log('Failed to reset expression:', error);
        }
    }, [setExpression]);

    return {
        setExpression,
        resetExpression,
    };
};