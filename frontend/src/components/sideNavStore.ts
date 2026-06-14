import { create } from 'zustand'

interface SideNavState {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useSideNav = create<SideNavState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
