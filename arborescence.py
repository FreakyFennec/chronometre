import os

EXCLUS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".vscode",
    ".idea",
    "dist",
    "build",
    ".cache"
}

def afficher_arborescence(dossier, prefixe=""):
    fichiers = sorted(os.listdir(dossier))

    fichiers = [
        f for f in fichiers
        if f not in EXCLUS
    ]

    for i, fichier in enumerate(fichiers):
        chemin = os.path.join(dossier, fichier)
        dernier = i == len(fichiers) - 1

        symbole = "└── " if dernier else "├── "
        print(prefixe + symbole + fichier)

        if os.path.isdir(chemin):
            nouveau_prefixe = prefixe + ("    " if dernier else "│   ")
            afficher_arborescence(chemin, nouveau_prefixe)


nom_dossier = os.path.basename(os.getcwd())

print(nom_dossier)

afficher_arborescence(".")