import { copyToClipboard } from "./clipboard";
import { createFileAndWriteContent } from "./file";

async function main(
    uuid: string,
    action: string,
    outputPath: string | null = null
): Promise<void> {
    if (action === "clipboard") {
        await copyToClipboard(uuid);
    } else if (action === "file") {
        if (!outputPath) {
            throw new Error(
                "outputPath is required when action is 'file'"
            );
        }

        await createFileAndWriteContent(uuid, outputPath);
    } else {
        throw new Error(
            `Invalid action: ${action}. Use "clipboard" or "file".`
        );
    }
}

const [uuid, action, outputPath] = process.argv.slice(2);

if (!uuid || !action) {
    console.error(
        "Usage: node index.js <uuid> <clipboard|file> [output-path]"
    );
    process.exit(1);
}

main(uuid, action, outputPath ?? null).catch((error: unknown) => {
    console.error(
        error instanceof Error ? error.message : error
    );
    process.exit(1);
});