/**
 * Tiny event bus for the inline-edit overlay. Used to toggle edit mode
 * from the App toolbar (which lives inside the React tree) and read it
 * from the overlay (which is portal-rendered and listens separately).
 *
 * Subscribers receive the current `enabled` state and re-render when it
 * flips. Kept outside React so the App's `<EditToggle>` button and the
 * overlay's mount can coordinate without prop drilling or context.
 */

type Listener = (enabled: boolean) => void;

class EditBus {
  private enabled = false;
  private listeners = new Set<Listener>();

  isEnabled(): boolean {
    return this.enabled;
  }

  toggle(): void {
    this.enabled = !this.enabled;
    this.emit();
  }

  set(next: boolean): void {
    if (this.enabled === next) return;
    this.enabled = next;
    this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.enabled);
  }
}

export const editBus = new EditBus();
