import { MultipleDirectorySelection, log, error, setting, i18n } from './multiple-directory-selection.js';

export class MultipleDocumentOwnershipConfig extends DocumentOwnershipConfig {
    constructor(object, options = {}) {
        super(object, options);
        this.documents = object.documents;
    }

    get title() {
        return `${game.i18n.localize("OWNERSHIP.Title")}: Multiple Documents`;
    }

    getData(options) {
        // User permission levels
        const playerLevels = Object.entries(CONST.DOCUMENT_META_OWNERSHIP_LEVELS).map(([name, level]) => {
            return { level, label: game.i18n.localize(`OWNERSHIP.${name}`) };
        });

        for (let [name, level] of Object.entries(CONST.DOCUMENT_OWNERSHIP_LEVELS)) {
            if ((level < 0)) continue;
            playerLevels.push({ level, label: game.i18n.localize(`OWNERSHIP.${name}`) });
        }

        // Default permission levels
        const defaultLevels = foundry.utils.deepClone(playerLevels);
        defaultLevels.shift();

        // Player users
        const users = game.users.map(user => {
            return {
                user,
                level: CONST.DOCUMENT_META_OWNERSHIP_LEVELS.NOCHANGE,
                isAuthor: false
            };
        });

        // Construct and return the data object
        return {
            currentDefault: CONST.DOCUMENT_META_OWNERSHIP_LEVELS.NOCHANGE,
            instructions: game.i18n.localize("OWNERSHIP.HintDocument"),
            defaultLevels,
            playerLevels,
            isFolder: false,
            users
        };
    }

    async _updateObject(event, formData) {
        event.preventDefault();
        if (!game.user.isGM) throw new Error("You do not have the ability to configure permissions.");

        const metaLevels = CONST.DOCUMENT_META_OWNERSHIP_LEVELS;
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
            const ownership = foundry.utils.deepClone(d.ownership);
            for (let [k, v] of Object.entries(ownershipLevels)) {
                if (v === metaLevels.DEFAULT) delete ownership[k];
                else ownership[k] = v;
            }
            return { _id: d.id, ownership };
        });

        return cls.updateDocuments(updates, { diff: false, recursive: false, noHook: true });
    }

    _canUserView() {
        return game.user.isGM;
    }

    get isEditable() {
        return game.user.isGM;
    }
}