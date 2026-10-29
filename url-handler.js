import Gio from 'gi://Gio';
import GioUnix from 'gi://GioUnix';
import GLib from 'gi://GLib';

const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.links-gnome';
const EXTENSION_UUID = 'links-gnome@jpupo91';
const HANDLER_ID = 'links-gnome-url-handler.desktop';

function getAppInfo(appId) {
    const appInfo = GioUnix.DesktopAppInfo.new(appId);
    if (!appInfo)
        throw new Error(`No se encontró la aplicación "${appId}".`);

    return appInfo;
}

function readRules(settings) {
    return settings.get_strv('rules').map((serializedRule, index) => {
        let rule;
        try {
            rule = JSON.parse(serializedRule);
        } catch (error) {
            throw new Error(`La regla ${index + 1} no es válida: ${error.message}`);
        }

        if (typeof rule.pattern !== 'string' || typeof rule.appId !== 'string')
            throw new Error(`La regla ${index + 1} debe tener "pattern" y "appId" de texto.`);

        return {
            pattern: rule.pattern.trim(),
            appId: rule.appId.trim(),
        };
    }).filter(rule => rule.pattern && rule.appId);
}

function resolveApp(settings, uri, scheme) {
    const lowerUri = uri.toLowerCase();
    const matchingRule = readRules(settings).find(rule =>
        lowerUri.includes(rule.pattern.toLowerCase()));

    if (matchingRule)
        return getAppInfo(matchingRule.appId);

    const fallbackId = settings.get_string('fallback-app').trim();
    if (fallbackId)
        return getAppInfo(fallbackId);

    const defaultApp = Gio.AppInfo.get_default_for_uri_scheme(scheme);
    if (!defaultApp)
        throw new Error(`No hay una aplicación predeterminada para el esquema "${scheme}".`);

    if (defaultApp.get_id() === HANDLER_ID) {
        throw new Error(
            'No hay una regla coincidente y el manejador es la aplicación predeterminada. ' +
            'Configura una aplicación alternativa en las preferencias.');
    }

    return defaultApp;
}

if (ARGV.length !== 1)
    throw new Error('El manejador debe recibir exactamente un enlace.');

const uri = ARGV[0];
const parsedUri = GLib.Uri.parse(uri, GLib.UriFlags.NONE);
const scheme = parsedUri.get_scheme()?.toLowerCase();
if (scheme !== 'http' && scheme !== 'https')
    throw new Error('Solo se admiten enlaces HTTP y HTTPS.');

const schemaDirectory = GLib.build_filenamev([
    GLib.get_user_data_dir(),
    'gnome-shell',
    'extensions',
    EXTENSION_UUID,
    'schemas',
]);
const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
    schemaDirectory,
    Gio.SettingsSchemaSource.get_default(),
    false);
const schema = schemaSource.lookup(SETTINGS_SCHEMA, false);
if (!schema)
    throw new Error(`No se encontró el esquema de configuración en "${schemaDirectory}".`);

const settings = new Gio.Settings({settings_schema: schema});
const app = resolveApp(settings, uri, scheme);
if (!app.launch_uris([uri], null))
    throw new Error(`No se pudo abrir el enlace con "${app.get_name()}".`);
