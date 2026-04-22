import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@tabby.ai/tabby-ui/O25/Button/IconButton';
import { Switch } from '@tabby.ai/tabby-ui/O25/Switch';
import { Text } from '@tabby.ai/tabby-ui/O25/Text';
import { TextButton } from '@tabby.ai/tabby-ui/O25/TextButton';
import MenuBurger24 from '@tabby.ai/tabby-ui/icons/core/MenuBurger24';
import { useEditModeAvailable } from '../../devtools/useEditModeAvailable';

import { useDirContext } from '../../DirContext';
import { useTokenTheme } from '../../ThemeContext';
import { useVariants, VARIANT_STORAGE_KEY, type VariantKey } from '../../VariantsContext';
import { editBus } from '../../devtools/editBus';
import { editsStore } from '../../devtools/editsStore';
import { copyEditsToClipboard } from '../../devtools/editCopier';
import ExitEditDialog from '../../devtools/ExitEditDialog';

import styles from './TopBar.module.css';

export interface TopBarPrototype {
  path: string;
  labelEn: string;
  labelAr: string;
}

interface TopBarProps {
  prototypes: TopBarPrototype[];
  activePath: string;
  /** Project name — shown centered in the header when no prototype label applies. */
  projectName: string;
  projectRoot: string;
  /** Extra chrome to render on the far right (back-button for mobile flows, etc.). */
  rightExtras?: ReactNode;
}

const MENU_LABEL = { en: 'Prototypes', ar: 'النماذج' } as const;
const RESET_LABEL = { en: 'Reset prototype', ar: 'إعادة التعيين' } as const;

/**
 * Unified top-bar chrome for every prototype. `data-tabby-edit-overlay`
 * on the header marks every interactive control inside as ignored by
 * the EditOverlay's capture-phase click handler.
 */
export default function TopBar({
  prototypes,
  activePath,
  projectName,
  projectRoot,
  rightExtras,
}: TopBarProps) {
  const { lang } = useDirContext();
  const { theme, setTheme } = useTokenTheme();
  const { variants, activeVariant, setActiveVariant } = useVariants();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editActive, setEditActive] = useState(editBus.isEnabled());
  const [editsCount, setEditsCount] = useState(editsStore.size());
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const editAvailable = useEditModeAvailable();

  const o26Active = theme === 'o26';

  useEffect(() => editBus.subscribe(setEditActive), []);
  useEffect(() => editsStore.subscribe(() => setEditsCount(editsStore.size())), []);

  useEffect(() => {
    if (!editAvailable && editBus.isEnabled()) {
      editBus.set(false);
    }
  }, [editAvailable]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocPointer(e: PointerEvent) {
      if (!menuWrapRef.current) return;
      if (!menuWrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  function handlePick(next: string) {
    navigate(next);
    setMenuOpen(false);
  }

  function handleReset() {
    // Restart = "back to the first screen of whichever variant I'm on."
    // Preserve the active variant selection, clear everything else in
    // sessionStorage (screen-local state), and navigate to "/" with a
    // full reload so component state resets to its scaffold defaults.
    try {
      const variant = window.sessionStorage.getItem(VARIANT_STORAGE_KEY);
      window.sessionStorage.clear();
      if (variant) {
        window.sessionStorage.setItem(VARIANT_STORAGE_KEY, variant);
      }
    } catch {
      /* sessionStorage can fail in Safari private mode */
    }
    window.location.replace(window.location.origin + '/');
  }

  function handleEditToggle() {
    if (editActive && editsStore.size() > 0) {
      setExitDialogOpen(true);
      return;
    }
    editBus.toggle();
  }

  async function handleCopyFromDialog() {
    await copyEditsToClipboard(projectName, projectRoot);
    setExitDialogOpen(false);
  }

  function handleExitFromDialog() {
    setExitDialogOpen(false);
    editBus.set(false);
  }

  const activePrototypeLabel = prototypes.find((p) => p.path === activePath);
  const centerTitle = activePrototypeLabel
    ? lang === 'en'
      ? activePrototypeLabel.labelEn
      : activePrototypeLabel.labelAr
    : projectName;

  return (
    <>
      <header className={styles.topbar} data-tabby-edit-overlay>
        <div className={styles.left}>
          <div className={styles.menuWrap} ref={menuWrapRef}>
            <IconButton
              size="s"
              variant="secondary"
              tone="neutral"
              level={2}
              aria-label={MENU_LABEL[lang]}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MenuBurger24 />
            </IconButton>
            {menuOpen && prototypes.length > 0 && (
              <div className={styles.menuPanel} role="menu">
                {prototypes.map(({ path, labelEn, labelAr }) => {
                  const label = lang === 'en' ? labelEn : labelAr;
                  const active = path === activePath;
                  return (
                    <div key={path} className={styles.menuItem} role="menuitem">
                      <TextButton
                        size={active ? 'body1Bold' : 'body1'}
                        type={active ? 'primaryAccent' : 'primary'}
                        onClick={() => handlePick(path)}
                      >
                        {label}
                      </TextButton>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {variants.length > 1 && (
            <div
              className={styles.variantsPill}
              role="radiogroup"
              aria-label="Variant"
              title={editActive ? 'Disabled in edit mode' : undefined}
            >
              {variants.map((key: VariantKey) => {
                const isActive = key === activeVariant;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    disabled={editActive}
                    className={isActive ? styles.variantActive : styles.variant}
                    onClick={() => setActiveVariant(key)}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            className={styles.restartBtn}
            onClick={handleReset}
            disabled={editActive}
            title={editActive ? 'Disabled in edit mode' : RESET_LABEL[lang]}
          >
            Restart
          </button>
        </div>

        <div className={styles.center} aria-live="polite">
          <span className={styles.centerTitle} title={centerTitle}>
            {centerTitle}
          </span>
        </div>

        <div className={styles.right}>
          {rightExtras}

          {editAvailable && (
            <button
              type="button"
              className={editActive ? styles.editToggleActive : styles.editToggle}
              onClick={handleEditToggle}
              aria-pressed={editActive}
            >
              {editActive ? 'Exit edit mode' : 'Edit'}
            </button>
          )}

          <label className={styles.toggle}>
            <Text variant="captionBold">{o26Active ? 'O26' : 'O25'}</Text>
            <Switch
              level={2}
              checked={o26Active}
              onChange={(e) => setTheme(e.target.checked ? 'o26' : 'o25')}
              aria-label="Token theme (O25 or O26)"
            />
          </label>
        </div>
      </header>

      {exitDialogOpen && (
        <ExitEditDialog
          editsCount={editsCount}
          onCancel={() => setExitDialogOpen(false)}
          onCopy={handleCopyFromDialog}
          onExit={handleExitFromDialog}
        />
      )}
    </>
  );
}
