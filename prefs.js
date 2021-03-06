/*
 * Obmin - Simple File Sharing Server For GNOME Desktop
 *
 * Copyright (C) 2017 Kostiantyn Korienkov <kapa76@gmail.com>
 *
 * This file is part of Obmin File Server.
 *
 * Obmin is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Filefinder is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
//const GLib = imports.gi.GLib;
const Lang = imports.lang;

const STARTUP_KEY = 'startup-settings';
const LINKS_KEY = 'links-settings';
const MOUNTS_KEY = 'mounts-settings';
const HIDDENS_KEY = 'hidden-settings';
const BACKUPS_KEY = 'backup-settings';
const SOURCES_KEY = 'content-sources';
const THEME_KEY = 'theme';
const MODE_KEY = 'server-mode';
const PORT_KEY = 'port';
const DEBUG_KEY = 'debug';

const Gettext = imports.gettext.domain('gnome-shell-extensions-obmin');
const _ = Gettext.gettext;

const EXTENSIONDIR = getCurrentFile ()[1];
imports.searchPath.unshift (EXTENSIONDIR);
const Convenience = imports.convenience;

let startup = false;
let links = true;
let mounts = true;
let hiddens = false;
let backups = false;
let theme = '';
let mode = 0;
let port = 8088;
let DEBUG = 1;

let settings = null;
let sources = [];

const ObminWidget = new Lang.Class({
    Name: 'ObminWidget',

    _init: function (params) {
        this.parent (0.0, "Obmin Widget", false);

        DEBUG = settings.get_int (DEBUG_KEY);
        startup = settings.get_boolean (STARTUP_KEY);
        port = settings.get_int (PORT_KEY);
        mode = settings.get_int (MODE_KEY);
        links = settings.get_boolean (LINKS_KEY);
        mounts = settings.get_boolean (MOUNTS_KEY);
        hiddens = settings.get_boolean (HIDDENS_KEY);
        backups = settings.get_boolean (BACKUPS_KEY);
        theme = settings.get_string (THEME_KEY);
        if (theme.length < 1) theme = "default";
        let srcs =  settings.get_string (SOURCES_KEY);
        if (srcs.length > 0) sources = JSON.parse (srcs);

        this.notebook = new Gtk.Notebook ({expand:true});

        this.general = new PageGeneral ();
        this.notebook.add (this.general);
        let label = new Gtk.Label ({label: _("General")});
        this.notebook.set_tab_label (this.general, label);

        this.behavior = new PageBehavior ();
        this.notebook.add (this.behavior);
        label = new Gtk.Label ({label: _("Behavior")});
        this.notebook.set_tab_label (this.behavior, label);

        this.display = new PageDisplay ();
        this.notebook.add (this.display);
        label = new Gtk.Label ({label: _("Display")});
        this.notebook.set_tab_label (this.display, label);

        this.notify = new PageNotify ();
        this.notebook.add (this.notify);
        label = new Gtk.Label ({label: _("Notifications")});
        this.notebook.set_tab_label (this.notify, label);

        this.notebook.show_all ();
    }
});

const PageGeneral = new Lang.Class({
    Name: 'PageGeneral',
    Extends: Gtk.ScrolledWindow,

    _init: function () {
        this.parent ();
        this.box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL, margin:6});
        this.box.border_width = 6;
        this.add (this.box);

        this.cb_startup = Gtk.CheckButton.new_with_label (_("Load on startup"));
        this.box.add (this.cb_startup);
        this.cb_startup.active = startup;
        this.cb_startup.connect ('toggled', Lang.bind (this, ()=>{
            startup = this.cb_startup.active;
            settings.set_boolean (STARTUP_KEY, startup);
        }));

        this.box.add (new Gtk.Label ({label: _("<b>Network</b>"), use_markup:true, xalign:0, margin_top:16}));
        let hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:6});
        this.box.pack_start (hbox, false, false, 0);
        hbox.add (new Gtk.Label ({label: _("Listening Port")}));
        this.port = Gtk.SpinButton.new_with_range (1, 65535, 1);
        this.port.value = port;
        this.port.connect ('value_changed', Lang.bind (this, ()=>{
            port = this.port.value;
            settings.set_int (PORT_KEY, port);
        }));
        hbox.pack_end (this.port, false, false, 0);

        this.box.add (new Gtk.Label ({label: _("<b>Content</b>"), use_markup:true, xalign:0, margin_top:12}));
        hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:6});
        this.box.pack_start (hbox, false, false, 0);
        hbox.add (new Gtk.Label ({label: _("Theme")}));
        this.theme = new Gtk.ComboBoxText ();
        let id = 0, i = 0;
        this.themes.forEach (s => {
            this.theme.append_text (s);
            if (s == theme) id = i;
            i++;
        });
        this.theme.active = id;
        this.theme.connect ('changed', Lang.bind (this, ()=>{
            let finfo;
            let dir = Gio.File.new_for_path (EXTENSIONDIR + "/data/themes/" + this.theme.get_active_text());
            debug (EXTENSIONDIR + "/data/themes/" + this.theme.get_active_text());
            if (!dir.query_exists (null)) return;
            var e = dir.enumerate_children ("*", Gio.FileQueryInfoFlags.NONE, null);
            while ((finfo = e.next_file (null)) != null) {
                if (finfo.get_file_type () != Gio.FileType.DIRECTORY)
                 Gio.File.new_for_path(dir.get_path() + "/" + finfo.get_name()).copy (Gio.File.new_for_path (EXTENSIONDIR + "/data/www/" + finfo.get_name()), Gio.FileCopyFlags.OVERWRITE, null, null);
            }
            settings.set_string (THEME_KEY, this.theme.get_active_text());
        }));
        hbox.pack_end (this.theme, false, false, 0);

        this.show_all ();
    },

    get themes () {
        let list = [], finfo;
        let dir = Gio.File.new_for_path (EXTENSIONDIR + "/data/themes");
        if (!dir.query_exists (null)) return list;
        var e = dir.enumerate_children ("*", Gio.FileQueryInfoFlags.NONE, null);
        while ((finfo = e.next_file (null)) != null) {
            if (finfo.get_file_type () != Gio.FileType.DIRECTORY) continue;
            if (!Gio.File.new_for_path(dir.get_path() + "/" + finfo.get_name() + "/style.css").query_exists (null))
                continue;
            list.push (finfo.get_name ());
        }
        return list;
    }
});

const PageDisplay = new Lang.Class({
    Name: 'PageDisplay',
    Extends: Gtk.ScrolledWindow,

    _init: function () {
        this.parent ();
        this.box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL, margin:6, spacing:8});
        this.box.border_width = 6;
        this.add (this.box);

        this.mounts = Gtk.CheckButton.new_with_label (_("Show mount points"));
        this.box.add (this.mounts);
        this.mounts.active = mounts;
        this.mounts.connect ('toggled', Lang.bind (this, ()=>{
            mounts = this.mounts.active;
            settings.set_boolean (MOUNTS_KEY, mounts);
        }));

        this.links = Gtk.CheckButton.new_with_label (_("Show symbolic links"));
        this.box.add (this.links);
        this.links.active = links;
        this.links.connect ('toggled', Lang.bind (this, ()=>{
            links = this.links.active;
            settings.set_boolean (LINKS_KEY, links);
        }));

        this.hiddens = Gtk.CheckButton.new_with_label (_("Show hidden content"));
        this.box.add (this.hiddens);
        this.hiddens.active = hiddens;
        this.hiddens.connect ('toggled', Lang.bind (this, ()=>{
            hiddens = this.hiddens.active;
            settings.set_boolean (HIDDENS_KEY, hiddens);
        }));

        this.backups = Gtk.CheckButton.new_with_label (_("Show backups"));
        this.box.add (this.backups);
        this.backups.active = backups;
        this.backups.connect ('toggled', Lang.bind (this, ()=>{
            backups = this.backups.active;
            settings.set_boolean (BACKUPS_KEY, backups);
        }));

        let hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:6});
        this.box.pack_start (hbox, false, false, 0);


        this.show_all ();
    }
});

const PageNotify = new Lang.Class({
    Name: 'PageNotify',
    Extends: Gtk.ScrolledWindow,

    _init: function () {
        this.parent ();
        this.box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL, margin:6});
        this.box.border_width = 6;
        this.add (this.box);

        let hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:6});
        this.box.pack_start (hbox, false, false, 0);
        let label = new Gtk.Label ({label: _("Debugging level")});
        hbox.add (label);
        this.level = new Gtk.ComboBoxText ();
        [_("ERROR"),_("INFO"),_("DEBUG")].forEach (s => {
            this.level.append_text (s);
        });
        this.level.active = DEBUG;
        this.level.connect ('changed', Lang.bind (this, ()=>{
            DEBUG = this.level.active;
            settings.set_int (DEBUG_KEY, DEBUG);
        }));
        hbox.pack_end (this.level, false, false, 0);

        this.show_all ();
    }
});

const PageBehavior = new Lang.Class({
    Name: 'PageBehavior',
    Extends: Gtk.ScrolledWindow,

    _init: function () {
        this.parent ();
        this.box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL, margin:6});
        this.box.border_width = 6;
        this.add (this.box);

        this.file_server = Gtk.RadioButton.new_with_label_from_widget (null, _("File Server"));
		this.box.pack_start (this.file_server, false, false, 0);
		let label = new Gtk.Label ({
		    label: "<i>"+_("Show the folder's list on requests.")+"</i>",
		    use_markup:true, xalign:0, margin_left:24, margin_bottom:12});
        label.wrap = true;
        this.box.add (label);

        this.mix_server = Gtk.RadioButton.new_with_label_from_widget (this.file_server, _("WEB/File Server"));
		this.box.pack_start (this.mix_server, false, false, 0);
		label = new Gtk.Label ({
		    label: "<i>"+_("Look for \'index.html\' first if it is not exist show the folder's list.")+"</i>",
		    use_markup:true, xalign:0, margin_left:24, margin_bottom:12});
		label.wrap = true;
        this.box.add (label);

        this.web_server = Gtk.RadioButton.new_with_label_from_widget (this.file_server, _("WEB Server"));
		this.box.pack_start (this.web_server, false, false, 0);
		label = new Gtk.Label ({
		    label: "<i>"+_("Look for \'index.html\' and direct links only if it is not exist show error \'404.html\'.")+"</i>",
		    use_markup:true, xalign:0, margin_left:24, margin_bottom:12});
		label.wrap = true;
        this.box.add (label);


        if (mode == 1) this.mix_server.active = true;
        else if (mode == 2) this.web_server.active = true;

		this.file_server.connect ('toggled', Lang.bind (this, ()=>{
		    if (this.file_server.active) settings.set_int (MODE_KEY, 0);
		}));
		this.mix_server.connect ('toggled', Lang.bind (this, ()=>{
		    if (this.mix_server.active) settings.set_int (MODE_KEY, 1);
		}));
        this.web_server.connect ('toggled', Lang.bind (this, ()=>{
		    if (this.web_server.active) settings.set_int (MODE_KEY, 2);
		}));

        this.show_all ();
    }
});

function getCurrentFile () {
    let stack = (new Error()).stack;
    let stackLine = stack.split('\n')[1];
    if (!stackLine)
        throw new Error ('Could not find current file');
    let match = new RegExp ('@(.+):\\d+').exec(stackLine);
    if (!match)
        throw new Error ('Could not find current file');
    let path = match[1];
    let file = Gio.File.new_for_path (path);
    return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}

function info (msg) {
    if (DEBUG > 0) print ("[obmin][prefs] " + msg);
}

function debug (msg) {
    if (DEBUG > 1) print ("[obmin][prefs] " + msg);
}

function error (msg) {
    print ("[obmin][prefs] (EE) " + msg);
}

function init() {
    Convenience.initTranslations ();
    let theme = imports.gi.Gtk.IconTheme.get_default();
    theme.append_search_path (EXTENSIONDIR + "/data/icons");
    settings = Convenience.getSettings ();
}

function buildPrefsWidget() {
    let widget = new ObminWidget ();
    return widget.notebook;
}
