import { registerSettings } from "./settings.js";
import { WithOwnershipConfig } from "./multiple-document-ownership-config.js";

export let debug = (...args) => {
    if (debugEnabled > 1) console.log("DEBUG: multiple-directory-selection | ", ...args);
};
export let log = (...args) => console.log("multiple-directory-selection | ", ...args);
export let warn = (...args) => {
    if (debugEnabled > 0) console.warn("multiple-directory-selection | ", ...args);
};
export let error = (...args) => console.error("multiple-directory-selection | ", ...args);
export let i18n = key => {
    return game.i18n.localize(key);
};

export let setting = key => {
    return game.settings.get("multiple-directory-selection", key);
};

export class MultipleDirectorySelection {
    static app = null;

    static async init() {
        log("initializing");

        registerSettings();

        let clickDocumentName = async function (wrapped, ...args) {
            if (this._groupSelect || this._startPointerDown) {
                let event = args[0];
                event.preventDefault();
                const documentId = event.currentTarget.closest(".document").dataset.documentId;

                if (this._groupSelect.has(documentId)) {
                    //remove the document
                    MultipleDirectorySelection.removeDocument(this, documentId);
                } else {
                    //add the document
                    MultipleDirectorySelection.addDocument(this, documentId);
                }
            } else
                return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("multiple-directory-selection", "ActorDirectory.prototype._onClickDocumentName", clickDocumentName, "MIXED");
            libWrapper.register("multiple-directory-selection", "CardsDirectory.prototype._onClickDocumentName", clickDocumentName, "MIXED");
            libWrapper.register("multiple-directory-selection", "ItemDirectory.prototype._onClickDocumentName", clickDocumentName, "MIXED");
            libWrapper.register("multiple-directory-selection", "JournalDirectory.prototype._onClickDocumentName", clickDocumentName, "MIXED");
            libWrapper.register("multiple-directory-selection", "PlaylistDirectory.prototype._onClickDocumentName", clickDocumentName, "MIXED");
            libWrapper.register("multiple-directory-selection", "SceneDirectory.prototype._onClickDocumentName", clickDocumentName, "MIXED");
            libWrapper.register("multiple-directory-selection", "RollTableDirectory.prototype._onClickDocumentName", clickDocumentName, "MIXED");
        } else {
            for (let dir of [ActorDirectory, CardsDirectory, ItemDirectory, JournalDirectory, PlaylistDirectory, SceneDirectory, RollTableDirectory]) {
                const oldClickDocumentName = dir.prototype._onClickDocumentName;
                dir.prototype._onClickDocumentName = function (event) {
                    return clickDocumentName.call(this, oldClickDocumentName.bind(this), ...arguments);
                }
            }
        }

        let onDropFolder = async function (wrapped, ...args) {
            if (this._groupSelect) {
                let event = args[0];
                event.preventDefault();

                const cls = this.constructor.documentName;
                const data = TextEditor.getDragEventData(event);
                if (!data.type) return;
                const target = event.target.closest(".directory-item") || null;

                // Call the drop handler
                if (data.type == cls) {
                    for (let id of this._groupSelect) {
                        let document = this.constructor.collection.get(id);
                        let docData = mergeObject(data, { uuid: document.uuid });
                        this._handleDroppedDocument(target, docData);
                    }
                    MultipleDirectorySelection.clearTab(this);
                } else
                    return wrapped(...args);
            } else
                return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("multiple-directory-selection", "ActorDirectory.prototype._onDrop", onDropFolder, "MIXED");
            libWrapper.register("multiple-directory-selection", "CardsDirectory.prototype._onDrop", onDropFolder, "MIXED");
            libWrapper.register("multiple-directory-selection", "ItemDirectory.prototype._onDrop", onDropFolder, "MIXED");
            libWrapper.register("multiple-directory-selection", "JournalDirectory.prototype._onDrop", onDropFolder, "MIXED");
            libWrapper.register("multiple-directory-selection", "PlaylistDirectory.prototype._onDrop", onDropFolder, "MIXED");
            libWrapper.register("multiple-directory-selection", "SceneDirectory.prototype._onDrop", onDropFolder, "MIXED");
            libWrapper.register("multiple-directory-selection", "RollTableDirectory.prototype._onDrop", onDropFolder, "MIXED");
        } else {
            for (let dir of [ActorDirectory, CardsDirectory, ItemDirectory, JournalDirectory, PlaylistDirectory, SceneDirectory, RollTableDirectory]) {
                const oldOnDrop = dir.prototype._onDrop;
                dir.prototype._onDrop = function (event) {
                    return onDropFolder.call(this, oldOnDrop.bind(this), ...arguments);
                }
            }
        }

        let importFromJSON = async function (wrapped, ...args) {
            let json = args[0];
            let data = JSON.parse(json);

            if (data instanceof Array) {
                let items = [];
                for (let obj of data) {
                    let document = this.collection.fromCompendium(obj, { addFlags: false });
                    items.push(document);
                }
                if (items.length)
                    this.constructor.createDocuments(items);
            } else
                return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("multiple-directory-selection", "Actor.prototype.importFromJSON", importFromJSON, "MIXED");
            libWrapper.register("multiple-directory-selection", "Cards.prototype.importFromJSON", importFromJSON, "MIXED");
            libWrapper.register("multiple-directory-selection", "Item.prototype.importFromJSON", importFromJSON, "MIXED");
            libWrapper.register("multiple-directory-selection", "JournalEntry.prototype.importFromJSON", importFromJSON, "MIXED");
            libWrapper.register("multiple-directory-selection", "Playlist.prototype.importFromJSON", importFromJSON, "MIXED");
            libWrapper.register("multiple-directory-selection", "Scene.prototype.importFromJSON", importFromJSON, "MIXED");
            libWrapper.register("multiple-directory-selection", "RollTable.prototype.importFromJSON", importFromJSON, "MIXED");
        } else {
            for (let entry of [Actor, Cards, Item, JournalEntry, Playlist, Scene, RollTable]) {
                const oldImportFromJSON = entry.prototype.importFromJSON;
                entry.prototype.importFromJSON = function (event) {
                    return importFromJSON.call(this, oldImportFromJSON.bind(this), ...arguments);
                }
            }
        }

        for (let tabName of ["ActorDirectory", "CardsDirectory", "ItemDirectory", "JournalDirectory", "playlPlaylistDirectoryists", "SceneDirectory", "RollTableDirectory"]) {
            Hooks.on(`get${tabName}EntryContext`, (html, menuItems) => {
                window.setTimeout(() => {
                    // make sure we're the last one to activate
                    for (let menu of menuItems) {
                        if (!menu.multiple) {
                            let oldCondition = menu.condition;
                            menu.condition = function (li) {
                                if (html.hasClass("multiple-select"))
                                    return false;
                                return oldCondition ? oldCondition(li) : true;
                            }
                        }
                    }
                }, 500);

                menuItems.push(
                    {
                        icon: '<i class="fas fa-trash"></i>',
                        name: "Delete Multiple",
                        multiple: true,
                        condition: (li) => {
                            return game.user.isGM && html.hasClass("multiple-select") && li.hasClass('selected');
                        },
                        callback: (li) => {
                            let tab = Object.values(ui.sidebar.tabs).find(t => t.constructor.name == tabName);
                            MultipleDirectorySelection.deleteDialog(tab);
                        }
                    },
                    {
                        icon: '<i class="far fa-copy"></i>',
                        name: "Duplicate Multiple",
                        multiple: true,
                        condition: (li) => {
                            return game.user.isGM && html.hasClass("multiple-select") && li.hasClass('selected');
                        },
                        callback: (li) => {
                            let tab = Object.values(ui.sidebar.tabs).find(t => t.constructor.name == tabName);
                            MultipleDirectorySelection.duplicateDocuments(tab);
                        }
                    },
                    {
                        icon: '<i class="fas fa-lock"></i>',
                        name: "Configure Ownership",
                        multiple: true,
                        condition: (li) => {
                            return game.user.isGM && html.hasClass("multiple-select") && li.hasClass('selected');
                        },
                        callback: (li) => {
                            let tab = Object.values(ui.sidebar.tabs).find(t => t.constructor.name == tabName);
                            MultipleDirectorySelection.ownershipDialog(tab, li);
                        }
                    },
                    {
                        icon: '<i class="fas fa-file-export"></i>',
                        name: "Export Data",
                        multiple: true,
                        condition: (li) => {
                            return html.hasClass("multiple-select") && li.hasClass('selected');
                        },
                        callback: (li) => {
                            let tab = Object.values(ui.sidebar.tabs).find(t => t.constructor.name == tabName);
                            MultipleDirectorySelection.exportDocuments(tab);
                        }
                    }
                );
            })
        }
    }

    static async setup() {
    }

    static async ready() {
    }

    static onMouseDown(event) {
        if (!this._groupSelect) {
            let id = event.currentTarget.closest(".document").dataset.documentId;
            let that = this;
            this._startPointerDown = window.setTimeout(() => {
                if (that._startPointerDown) {
                    // Start theselection process
                    delete that._startPointerDown;
                    that._groupSelect = new Set();
                    $(that.element).addClass("multiple-select");
                    //Add the class, but don't add the document as the click document will handle that, but the user needs a visual queue
                    $(`.document[data-document-id="${id}"]`, that.element).addClass("selected");
                }
            }, setting("long-press") * 1000);
        }
    }

    static onMouseUp() {
        if (this._startPointerDown) {
            window.clearTimeout(this._startPointerDown);
            delete this._startPointerDown;
        }
    }

    static onContext(event) {
        if (this._groupSelect) {
            let id = event.currentTarget.closest(".document").dataset.documentId;
            if (this._groupSelect.has(id)) {
                // carry on but provide a slightly modified context menu
            } else {
                // cancel the group selection and cancel the context menu
                MultipleDirectorySelection.clearTab(this);
                let closeId = window.setInterval(() => {
                    if (ui.context) {
                        ui.context.menu.hide();
                        ui.context.close();
                        window.clearInterval(closeId);
                    }
                }, 10);
            }
        }
    }

    static addDocument(dir, id) {
        dir._groupSelect.add(id);
        $(`.document[data-document-id="${id}"]`, dir.element).addClass("selected");
    }

    static removeDocument(dir, id) {
        dir._groupSelect.delete(id);
        $(`.document[data-document-id="${id}"]`, dir.element).removeClass("selected");
        if (dir._groupSelect.size == 0) {
            MultipleDirectorySelection.clearTab(dir);
        }
    }

    static clearTab(dir) {
        if (dir._groupSelect) {
            delete dir._groupSelect;
            delete dir._startPointerDown;
            $('.document.selected', dir.element).removeClass("selected");
            $(dir.element).removeClass("multiple-select");
        }
    }

    static clearAllTabs() {
        for (let dir of Object.values(ui.sidebar.tabs)) {
            MultipleDirectorySelection.clearTab(dir);
        }
    }

    static deleteDialog(tab) {
        if (tab) {
            //show the delete dialog for multiple entries
            const documentClass = tab.constructor.collection.documentClass;
            const type = game.i18n.localize(documentClass.metadata.label);
            return Dialog.confirm({
                title: `${game.i18n.format("DOCUMENT.Delete", { type: `${tab._groupSelect.size} ${type}` })}`,
                content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>${game.i18n.format("MultipleDirectorySelection.DeleteWarning", { count: tab._groupSelect.size })}</p>`,
                yes: () => {
                    let ids = Array.from(tab._groupSelect).filter(id => {
                        let document = tab.constructor.collection.get(id);
                        return document && document.canUserModify(game.user, "delete")
                    });
                    if (ids.length) {
                        documentClass.deleteDocuments(ids);
                        if (ids.length != tab._groupSelect.size) {
                            ui.notifications.warn("Some of these documents weren't deleted because you do not have permissions to complete the request.");
                            for (let id of ids)
                                MultipleDirectorySelection.removeDocument(tab, id);
                        } else
                            MultipleDirectorySelection.clearTab(tab);
                    } else
                        ui.notifications.warn("You do not have permission to delete these documents");
                }
            });
        }
    }

    static duplicateDocuments(tab) {
        if (tab) {
            //show the delete dialog for multiple entries
            const collection = tab.constructor.collection;
            let items = [];
            for (let id of tab._groupSelect) {
                let document = collection.get(id);
                if (document.isOwner) {
                    let data = document.toObject(false);
                    let realname = (data.name.endsWith(" (Copy)") ? data.name.substr(0, data.name.length - 7) : data.name);
                    let name = realname + " (Copy)";
                    let count = 1;
                    while (collection.find(d => d.name == name)) {
                        count++;
                        name = `${realname} (Copy ${count})`;
                    }
                    data.name = name;
                    items.push(data);
                }
            }
            if (items.length) {
                collection.documentClass.createDocuments(items);
                MultipleDirectorySelection.clearTab(tab);
            }
        }
    }

    static ownershipDialog(tab, li) {
        if (tab) {
            //show the delete dialog for multiple entries
            const collection = tab.constructor.collection;
            const documentClass = collection.documentClass;

            let documents = [];
            for (let id of tab._groupSelect) {
                documents.push(collection.get(id));
            }

            const configClass = WithOwnershipConfig(isNewerVersion(game.version, "9.99999") ? DocumentOwnershipConfig : PermissionControl);
            new configClass({ documents, apps: {}, uuid: "", testUserPermission: () => { return true; }, isOwner: true }, {
                top: Math.min(li[0].offsetTop, window.innerHeight - 350),
                left: window.innerWidth - 720
            }).render(true);
        }
    }

    static exportDocuments(tab) {
        if (tab) {
            const collection = tab.constructor.collection;
            let items = [];
            for (let id of tab._groupSelect) {
                let document = collection.get(id);
                if (document.isOwner) {
                    const data = document.toCompendium(null);
                    data.flags["exportSource"] = {
                        world: game.world.id,
                        system: game.system.id,
                        coreVersion: game.version,
                        systemVersion: game.system.version
                    };
                    items.push(data);
                }
            }
            if (items.length) {
                const filename = `fvtt-${collection.documentName}-multiple.json`;
                saveDataToFile(JSON.stringify(items, null, 2), "text/json", filename);
                if (ids.length != tab._groupSelect.size) {
                    ui.notifications.warn("Some of these documents weren't deleted because you do not have permissions to complete the request.");
                    for (let id of ids)
                        MultipleDirectorySelection.removeDocument(tab, id);
                } else
                    MultipleDirectorySelection.clearTab(tab);
            } else
                ui.notifications.warn("You do not have permission to export these documents");
        }
    }
}

Hooks.once('init', MultipleDirectorySelection.init);
Hooks.once('setup', MultipleDirectorySelection.setup);
Hooks.once('ready', MultipleDirectorySelection.ready);

Hooks.on("renderSidebarDirectory", (directory, html, options) => {
    $('.document', html)
        .on("pointerdown", MultipleDirectorySelection.onMouseDown.bind(directory))
        .on("pointerup", MultipleDirectorySelection.onMouseUp.bind(directory))
        .on("contextmenu", MultipleDirectorySelection.onContext.bind(directory));
});

Hooks.on("changeSidebarTab", MultipleDirectorySelection.clearAllTabs);
