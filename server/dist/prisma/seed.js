var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url"; // Needed for __dirname in ESM
const prisma = new PrismaClient();
// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function toPascalCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
function toCamelCase(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
}
function insertLocationData(locations) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const location of locations) {
            const { id, country, city, state, address, postalCode, coordinates } = location;
            try {
                yield prisma.$executeRaw `
        INSERT INTO "Location" ("id", "country", "city", "state", "address", "postalCode", "coordinates") 
        VALUES (${id}, ${country}, ${city}, ${state}, ${address}, ${postalCode}, ST_GeomFromText(${coordinates}, 4326));
      `;
                console.log(`Inserted location for ${city}`);
            }
            catch (error) {
                console.error(`Error inserting location for ${city}:`, error);
            }
        }
    });
}
function resetSequence(modelName) {
    return __awaiter(this, void 0, void 0, function* () {
        const quotedModelName = `"${toPascalCase(modelName)}"`;
        const maxIdResult = yield prisma[modelName].findMany({
            select: { id: true },
            orderBy: { id: "desc" },
            take: 1,
        });
        if (maxIdResult.length === 0)
            return;
        const nextId = maxIdResult[0].id + 1;
        yield prisma.$executeRaw(Prisma.raw(`
    SELECT setval(pg_get_serial_sequence('${quotedModelName}', 'id'), coalesce(max(id)+1, ${nextId}), false) FROM ${quotedModelName};
  `));
        console.log(`Reset sequence for ${modelName} to ${nextId}`);
    });
}
function deleteAllData(orderedFileNames) {
    return __awaiter(this, void 0, void 0, function* () {
        const modelNames = orderedFileNames.map((fileName) => {
            return toPascalCase(path.basename(fileName, path.extname(fileName)));
        });
        for (const modelName of modelNames.reverse()) {
            const modelNameCamel = toCamelCase(modelName);
            const model = prisma[modelNameCamel];
            if (!model) {
                console.error(`Model ${modelName} not found in Prisma client`);
                continue;
            }
            try {
                yield model.deleteMany({});
                console.log(`Cleared data from ${modelName}`);
            }
            catch (error) {
                console.error(`Error clearing data from ${modelName}:`, error);
            }
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const dataDirectory = path.join(__dirname, "seedData");
        const orderedFileNames = [
            "location.json", // No dependencies
            "manager.json", // No dependencies
            "property.json", // Depends on location and manager
            "tenant.json", // No dependencies
            "lease.json", // Depends on property and tenant
            "application.json", // Depends on property and tenant
            "payment.json", // Depends on lease
        ];
        // Delete all existing data
        yield deleteAllData(orderedFileNames);
        // Seed data
        for (const fileName of orderedFileNames) {
            const filePath = path.join(dataDirectory, fileName);
            const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            const modelName = toPascalCase(path.basename(fileName, path.extname(fileName)));
            const modelNameCamel = toCamelCase(modelName);
            if (modelName === "Location") {
                yield insertLocationData(jsonData);
            }
            else {
                const model = prisma[modelNameCamel];
                try {
                    for (const item of jsonData) {
                        yield model.create({
                            data: item,
                        });
                    }
                    console.log(`Seeded ${modelName} with data from ${fileName}`);
                }
                catch (error) {
                    console.error(`Error seeding data for ${modelName}:`, error);
                }
            }
            // Reset the sequence after seeding each model
            yield resetSequence(modelName);
            yield sleep(1000);
        }
    });
}
main()
    .catch((e) => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () { return yield prisma.$disconnect(); }));
