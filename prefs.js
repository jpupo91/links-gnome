import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from
    'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class LinksGnomePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this._settings = this.getSettings();
        this._ruleRows = [];
        window.set_default_size(720, 520);

        const page = new Adw.PreferencesPage();
        const rulesGroup = new Adw.PreferencesGroup({
            title: 'Reglas de apertura',
            description: 'Las reglas se prueban en orden. Se usa la primera URL que contenga el texto indicado.',
        });
        page.add(rulesGroup);

        this._rulesBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
        });
        rulesGroup.add(this._rulesBox);

        const addButton = new Gtk.Button({
            label: 'Añadir regla',
            halign: Gtk.Align.START,
            margin_top: 8,
        });
        addButton.connect('clicked', () => this._addRule('', ''));
        rulesGroup.add(addButton);

        for (const serializedRule of this._settings.get_strv('rules')) {
            try {
                const rule = JSON.parse(serializedRule);
                this._addRule(rule.pattern ?? '', rule.appId ?? '');
            } catch (error) {
                console.error(`No se pudo leer una regla guardada: ${error.message}`);
            }
        }

        const fallbackGroup = new Adw.PreferencesGroup({
            title: 'Aplicación alternativa',
            description: 'Se usa cuando ninguna regla coincide. Déjalo vacío para usar la aplicación predeterminada del sistema.',
        });
        page.add(fallbackGroup);

        const fallbackRow = new Adw.ActionRow({
            title: 'ID de aplicación (.desktop)',
            subtitle: 'Por ejemplo: org.gnome.Epiphany.desktop',
        });
        this._fallbackEntry = new Gtk.Entry({
            text: this._settings.get_string('fallback-app'),
            placeholder_text: 'Vacío = aplicación predeterminada',
            hexpand: true,
            valign: Gtk.Align.CENTER,
        });
        fallbackRow.add_suffix(this._fallbackEntry);
        fallbackRow.activatable_widget = this._fallbackEntry;
        fallbackGroup.add(fallbackRow);
        this._fallbackEntry.connect('changed', () => {
            this._settings.set_string('fallback-app', this._fallbackEntry.text.trim());
        });

        window.add(page);
    }

    _addRule(pattern, appId) {
        const row = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            hexpand: true,
        });
        const patternEntry = new Gtk.Entry({
            text: pattern,
            placeholder_text: 'Texto de URL, p. ej. meet.google.com',
            hexpand: true,
        });
        const appEntry = new Gtk.Entry({
            text: appId,
            placeholder_text: 'ID de aplicación, p. ej. org.gnome.Epiphany.desktop',
            hexpand: true,
        });
        const moveUpButton = new Gtk.Button({
            icon_name: 'go-up-symbolic',
            tooltip_text: 'Mover regla hacia arriba',
            valign: Gtk.Align.CENTER,
        });
        const moveDownButton = new Gtk.Button({
            icon_name: 'go-down-symbolic',
            tooltip_text: 'Mover regla hacia abajo',
            valign: Gtk.Align.CENTER,
        });
        const removeButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            tooltip_text: 'Eliminar regla',
            valign: Gtk.Align.CENTER,
        });
        row.append(patternEntry);
        row.append(appEntry);
        row.append(moveUpButton);
        row.append(moveDownButton);
        row.append(removeButton);
        this._rulesBox.append(row);

        const ruleRow = {row, patternEntry, appEntry, moveUpButton, moveDownButton};
        this._ruleRows.push(ruleRow);
        const save = () => this._saveRules();
        patternEntry.connect('changed', save);
        appEntry.connect('changed', save);
        moveUpButton.connect('clicked', () => this._moveRule(ruleRow, -1));
        moveDownButton.connect('clicked', () => this._moveRule(ruleRow, 1));
        removeButton.connect('clicked', () => {
            this._ruleRows = this._ruleRows.filter(item => item !== ruleRow);
            this._rulesBox.remove(row);
            this._updateRuleControls();
            this._saveRules();
        });
        this._updateRuleControls();
    }

    _moveRule(ruleRow, direction) {
        const index = this._ruleRows.indexOf(ruleRow);
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= this._ruleRows.length)
            return;

        const otherRow = this._ruleRows[nextIndex];
        if (direction < 0) {
            const previousSibling = this._ruleRows[index - 2]?.row ?? null;
            this._rulesBox.reorder_child_after(ruleRow.row, previousSibling);
        } else {
            this._rulesBox.reorder_child_after(ruleRow.row, otherRow.row);
        }

        this._ruleRows[index] = otherRow;
        this._ruleRows[nextIndex] = ruleRow;
        this._updateRuleControls();
        this._saveRules();
    }

    _updateRuleControls() {
        this._ruleRows.forEach((ruleRow, index) => {
            ruleRow.moveUpButton.sensitive = index > 0;
            ruleRow.moveDownButton.sensitive = index < this._ruleRows.length - 1;
        });
    }

    _saveRules() {
        const rules = this._ruleRows.map(({patternEntry, appEntry}) =>
            JSON.stringify({
                pattern: patternEntry.text.trim(),
                appId: appEntry.text.trim(),
            }));
        this._settings.set_strv('rules', rules);
    }
}
