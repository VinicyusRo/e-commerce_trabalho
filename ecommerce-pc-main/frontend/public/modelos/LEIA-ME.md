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

Modelos de produtos específicos (migração 12):

| Arquivo | Produto |
|---|---|
| `samsung-990-pro.glb` | SSD Samsung 990 Pro |
| `logitech-mx-master-3s.glb` | Logitech MX Master 3S |
| `dualsense.glb` | DualSense Sony PS5 |
| `ryzen-5-7600.glb` | AMD Ryzen 5 7600 |
| `core-i5-12400f.glb` | Intel Core i5-12400F |

Os créditos de cada modelo ficam nas migrações 11 e 12 (`database/`) e no README. Trocou de modelo? Atualize os dois.
Sem o arquivo, a página do produto usa o modelo gerado por código.

Os arquivos foram reduzidos com `@gltf-transform` (até ~60 mil triângulos e texturas de 1024 px em WebP), sem Draco nem meshopt, porque o `GLTFLoader` do projeto não carrega esses formatos.
