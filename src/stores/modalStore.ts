import { create } from 'zustand';
import type { ModalState } from '@types';

export const useModalStore = create<ModalState>()((set, get) => ({
  activeModal: null,
  modalData: {},

  openModal: (name: string, data?: Record<string, unknown>) => {
    set({ activeModal: name, modalData: data ?? {} });
  },

  closeModal: () => {
    set({ activeModal: null, modalData: {} });
  },

  isOpen: (name: string) => {
    return get().activeModal === name;
  },
}));
