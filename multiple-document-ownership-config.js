import { MultipleDocumentSelection, log, error, setting, i18n } from './multiple-document-selection.js';

export const WithOwnershipConfig = (ConfigClass) => {
    class MultipleDocumentOwnershipConfig extends ConfigClass {
        constructor(object, options = {}) {
            super(object, options);
            this.documents = object.documents;
        }

        get title() {
            return `${game.i18n.localize("OWNERSHIP.Title")}: Multiple Documents`;
        }

        getData(options) {
            // User permission levels
            let playerLevels = {};
            if (isNewerVersion(game.version, "9.999999")) {
                playerLevels = Object.entries(CONST.DOCUMENT_META_OWNERSHIP_LEVELS).map(([name, level]) => {
                    return { level, label: game.i18n.localize(`OWNERSHIP.${name}`) };
                });
                for (let [name, level] of Object.entries(CONST.DOCUMENT_OWNERSHIP_LEVELS)) {
                    if ((level < 0)) continue;
                    playerLevels.push({ level, label: game.i18n.localize(`OWNERSHIP.${name}`) });
                }
            } else {
                playerLevels["-2"] = game.i18n.localize("PERMISSION.DEFAULT");
                playerLevels["-1"] = game.i18n.localize("PERMISSION.NOCHANGE");
                for (let [n, l] of Object.entries(CONST.DOCUMENT_PERMISSION_LEVELS)) {
                    playerLevels[l] = game.i18n.localize(`PERMISSION.${n}`);
                }
            }

            // Default permission levels
            const defaultLevels = foundry.utils.deepClone(playerLevels);
            if (isNewerVersion(game.version, "9.999999")) {
                defaultLevels.shift();
            } else {
                delete defaultLevels["-2"];
            }

            // Player users
            const users = game.users.map(user => {
                return {
                    user,
                    level: CONST.DOCUMENT_META_OWNERSHIP_LEVELS?.NOCHANGE ?? "-1",
                    isAuthor: false
                };
            });

            // Construct and return the data object
            return {
                currentDefault: CONST.DOCUMENT_META_OWNERSHIP_LEVELS?.NOCHANGE ?? "-1",
                instructions: game.i18n.localize(isNewerVersion(game.version, "9.999999") ? "OWNERSHIP.HintDocument" : "PERMISSION.HintDocument"),
                defaultLevels,
                playerLevels,
                isFolder: false,
                users
            };
        }

        async _updateObject(event, formData) {
            event.preventDefault();
            if (!game.user.isGM) throw new Error("You do not have the ability to configure permissions.");

            const metaLevels = isNewerVersion(game.version, "9.999999") ? CONST.DOCUMENT_META_OWNERSHIP_LEVELS : { DEFAULT: -2, NOCHANGE: -1 };
            const omit = metaLevels.NOCHANGE;
            const ownershipLevels = {};
            for (let [user, level] of Object.entries(formData)) {
                if (level === omit) {
                    delete ownershipLevels[user];
                    continue;
                }
                ownershipLevels[user] = level;
            }

            let cls = getDocumentClass(this.documents[0].documentName);
            const updates = this.documents.map(d => {
                const ownership = foundry.utils.deepClone(isNewerVersion(game.version, "9.999999") ? d.ownership : d.data.permission);
                for (let [k, v] of Object.entries(ownershipLevels)) {
                    if (v === metaLevels.DEFAULT) delete ownership[k];
                    else ownership[k] = v;
                }
                let data = { _id: d.id };
                if (isNewerVersion(game.version, "9.999999"))
                    data.ownership = ownership;
                else
                    data.permission = ownership;
                return data;
            });

            return cls.updateDocuments(updates, { diff: false, recursive: false, noHook: true });
        }

        _canUserView() {
            return game.user.isGM;
        }

        get isEditable() {
            return game.user.isGM;
        }

        _getHeaderButtons() {
            const buttons = [
                {
                    label: "Close",
                    class: "close",
                    icon: "fas fa-times",
                    onclick: () => this.close()
                }
            ];
            for (let cls of this.constructor._getInheritanceChain()) {
                Hooks.call(`get${cls.name}HeaderButtons`, this, buttons);
            }
            return buttons;
        }
    }

    const constructorName = "MultipleDocumentOwnershipConfig";
    Object.defineProperty(MultipleDocumentOwnershipConfig.prototype.constructor, "name", { value: constructorName });
    return MultipleDocumentOwnershipConfig;
}