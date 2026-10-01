import { useState } from 'react';
import { showToast } from './useToasts';

export function useFeedback() {
  const [message, setMessageState] = useState('');
  const [error, setErrorState] = useState('');

  function setMessage(value: string) {
    setMessageState(value);
  }

  function setError(value: string) {
    setErrorState(value);
    if (value) showToast('error', value);
  }

  function toastSuccess(value: string) {
    setMessageState(value);
    showToast('success', value);
  }

  function toastWarning(value: string) {
    showToast('warning', value);
  }

  function clearFeedback() {
    setMessageState('');
    setErrorState('');
  }

  function catchError(err: unknown, fallback: string) {
    setError(err instanceof Error ? err.message : fallback);
  }

  return {
    message,
    error,
    setMessage,
    setError,
    toastSuccess,
    toastWarning,
    clearFeedback,
    catchError,
  };
}
