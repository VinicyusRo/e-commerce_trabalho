# Modelos 3D baixados

Coloque aqui os arquivos `.glb` baixados do Sketchfab (Download → "glTF Binary (.glb)"), com estes nomes:

| Arquivo | Categoria |
|---|---|
| `placa-de-video.glb` | Placas de vídeo |
| `processador.glb` | Processadores |
| `memoria.glb` | Memórias RAM |
| `armazenamento.glb` | Armazenamento |
| `placa-mae.glb` | Placas-mãe |
| `gabinete.glb` | Gabinetes |
| `fonte.glb` | Fontes |
| `cooler.glb` | Coolers |
| `ventoinha.glb` | Ventoinhas |
| `monitor.glb` | Monitores |
| `teclado.glb` | Teclados |
| `mouse.glb` | Mouses |
| `headset.glb` | Headsets e fones |
| `controle.glb` | Controles |
| `cadeira.glb` | Cadeiras |

Os créditos de cada modelo ficam em `database/migracao-11-modelos-sketchfab.sql` e no README. Trocou de modelo? Atualize os dois.
Sem o arquivo, a página do produto usa o modelo gerado por código.

Os arquivos foram reduzidos com `@gltf-transform` (até ~60 mil triângulos e texturas de 1024 px em WebP), sem Draco nem meshopt, porque o `GLTFLoader` do projeto não carrega esses formatos.
