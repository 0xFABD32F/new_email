"""
Module pour calculer les frais de transport DHL basé sur les tarifs du PDF
"""
from typing import Dict, List, Tuple, Optional, Union, Any
import json
import math

class DHLPdfCalculator:
    """
    Calculateur de frais de transport DHL basé sur les tarifs du PDF
    """
    
    def __init__(self):
        """
        Initialise le calculateur avec les tarifs du PDF
        """
        # Tarifs DHL pour l'export (en MAD)
        self.dhl_export_rates = {
            # Format: poids_kg: {zone: tarif}
            0.5: {1: 26.00, 2: 62.00, 3: 26.00, 4: 49.00, 5: 49.00, 6: 107.00, 7: 49.00, 8: 49.00, 9: 163.00, 10: 26.00},
            1.0: {1: 50.00, 2: 73.00, 3: 50.00, 4: 73.00, 5: 73.00, 6: 131.00, 7: 73.00, 8: 73.00, 9: 187.00, 10: 50.00},
            1.5: {1: 50.00, 2: 73.00, 3: 50.00, 4: 73.00, 5: 73.00, 6: 131.00, 7: 73.00, 8: 73.00, 9: 187.00, 10: 50.00},
            2.0: {1: 50.00, 2: 73.00, 3: 50.00, 4: 73.00, 5: 73.00, 6: 131.00, 7: 73.00, 8: 73.00, 9: 187.00, 10: 50.00},
            2.5: {1: 65.00, 2: 88.00, 3: 74.00, 4: 95.00, 5: 104.00, 6: 162.00, 7: 111.00, 8: 117.00, 9: 231.00, 10: 74.00},
            3.0: {1: 80.00, 2: 103.00, 3: 98.00, 4: 117.00, 5: 135.00, 6: 193.00, 7: 149.00, 8: 161.00, 9: 275.00, 10: 98.00},
            4.0: {1: 110.00, 2: 133.00, 3: 139.00, 4: 161.00, 5: 197.00, 6: 255.00, 7: 224.00, 8: 247.00, 9: 361.00, 10: 139.00},
            5.0: {1: 140.00, 2: 163.00, 3: 180.00, 4: 205.00, 5: 259.00, 6: 317.00, 7: 299.00, 8: 333.00, 9: 447.00, 10: 180.00},
            6.0: {1: 229.00, 2: 375.00, 3: 356.00, 4: 323.00, 5: 501.00, 6: 435.00, 7: 417.00, 8: 627.00, 9: 565.00, 10: 328.00},
            7.0: {1: 318.00, 2: 587.00, 3: 532.00, 4: 441.00, 5: 743.00, 6: 553.00, 7: 535.00, 8: 921.00, 9: 683.00, 10: 476.00},
            8.0: {1: 407.00, 2: 799.00, 3: 708.00, 4: 559.00, 5: 985.00, 6: 671.00, 7: 653.00, 8: 1215.00, 9: 801.00, 10: 624.00},
            9.0: {1: 496.00, 2: 1011.00, 3: 884.00, 4: 677.00, 5: 1227.00, 6: 789.00, 7: 771.00, 8: 1509.00, 9: 919.00, 10: 772.00},
            10.0: {1: 585.00, 2: 1223.00, 3: 1060.00, 4: 795.00, 5: 1469.00, 6: 907.00, 7: 889.00, 8: 1803.00, 9: 1037.00, 10: 920.00},
            11.0: {1: 620.00, 2: 1258.00, 3: 1125.00, 4: 884.00, 5: 1567.00, 6: 1000.00, 7: 978.00, 8: 1979.00, 9: 1155.00, 10: 967.00},
            12.0: {1: 655.00, 2: 1293.00, 3: 1190.00, 4: 973.00, 5: 1665.00, 6: 1093.00, 7: 1067.00, 8: 2155.00, 9: 1273.00, 10: 1014.00},
            13.0: {1: 690.00, 2: 1328.00, 3: 1255.00, 4: 1062.00, 5: 1763.00, 6: 1186.00, 7: 1156.00, 8: 2331.00, 9: 1391.00, 10: 1061.00},
            14.0: {1: 725.00, 2: 1363.00, 3: 1320.00, 4: 1151.00, 5: 1861.00, 6: 1279.00, 7: 1245.00, 8: 2507.00, 9: 1509.00, 10: 1108.00},
            15.0: {1: 760.00, 2: 1398.00, 3: 1385.00, 4: 1240.00, 5: 1959.00, 6: 1372.00, 7: 1334.00, 8: 2683.00, 9: 1627.00, 10: 1155.00},
            16.0: {1: 795.00, 2: 1433.00, 3: 1450.00, 4: 1329.00, 5: 2057.00, 6: 1465.00, 7: 1423.00, 8: 2859.00, 9: 1745.00, 10: 1202.00},
            17.0: {1: 830.00, 2: 1468.00, 3: 1515.00, 4: 1418.00, 5: 2155.00, 6: 1558.00, 7: 1512.00, 8: 3035.00, 9: 1863.00, 10: 1249.00},
            18.0: {1: 865.00, 2: 1503.00, 3: 1580.00, 4: 1507.00, 5: 2253.00, 6: 1651.00, 7: 1601.00, 8: 3211.00, 9: 1981.00, 10: 1296.00},
            19.0: {1: 900.00, 2: 1538.00, 3: 1645.00, 4: 1596.00, 5: 2351.00, 6: 1744.00, 7: 1690.00, 8: 3387.00, 9: 2099.00, 10: 1343.00},
            20.0: {1: 935.00, 2: 1573.00, 3: 1710.00, 4: 1685.00, 5: 2449.00, 6: 1837.00, 7: 1779.00, 8: 3563.00, 9: 2217.00, 10: 1390.00},
            21.0: {1: 982.00, 2: 1626.00, 3: 1787.00, 4: 1774.00, 5: 2547.00, 6: 1930.00, 7: 1868.00, 8: 3692.00, 9: 2335.00, 10: 1452.00},
            22.0: {1: 1029.00, 2: 1679.00, 3: 1864.00, 4: 1863.00, 5: 2645.00, 6: 2023.00, 7: 1957.00, 8: 3821.00, 9: 2453.00, 10: 1514.00},
            23.0: {1: 1076.00, 2: 1732.00, 3: 1941.00, 4: 1952.00, 5: 2743.00, 6: 2116.00, 7: 2046.00, 8: 3950.00, 9: 2571.00, 10: 1576.00},
            24.0: {1: 1123.00, 2: 1785.00, 3: 2018.00, 4: 2041.00, 5: 2841.00, 6: 2209.00, 7: 2135.00, 8: 4079.00, 9: 2689.00, 10: 1638.00},
            25.0: {1: 1170.00, 2: 1838.00, 3: 2095.00, 4: 2130.00, 5: 2939.00, 6: 2302.00, 7: 2224.00, 8: 4208.00, 9: 2807.00, 10: 1700.00},
            26.0: {1: 1217.00, 2: 1891.00, 3: 2172.00, 4: 2219.00, 5: 3037.00, 6: 2395.00, 7: 2313.00, 8: 4337.00, 9: 2925.00, 10: 1762.00},
            27.0: {1: 1264.00, 2: 1944.00, 3: 2249.00, 4: 2308.00, 5: 3135.00, 6: 2488.00, 7: 2402.00, 8: 4466.00, 9: 3043.00, 10: 1824.00},
            28.0: {1: 1311.00, 2: 1997.00, 3: 2326.00, 4: 2397.00, 5: 3233.00, 6: 2581.00, 7: 2491.00, 8: 4595.00, 9: 3161.00, 10: 1886.00},
            29.0: {1: 1358.00, 2: 2050.00, 3: 2403.00, 4: 2486.00, 5: 3331.00, 6: 2674.00, 7: 2580.00, 8: 4724.00, 9: 3279.00, 10: 1948.00},
            30.0: {1: 1405.00, 2: 2103.00, 3: 2480.00, 4: 2575.00, 5: 3429.00, 6: 2767.00, 7: 2669.00, 8: 4853.00, 9: 3397.00, 10: 2010.00},
            40.0: {1: 1845.00, 2: 2873.00, 3: 3190.00, 4: 3465.00, 5: 4409.00, 6: 3697.00, 7: 3559.00, 8: 5793.00, 9: 4577.00, 10: 2450.00},
            50.0: {1: 2285.00, 2: 3643.00, 3: 3900.00, 4: 4355.00, 5: 5389.00, 6: 4627.00, 7: 4449.00, 8: 6733.00, 9: 5757.00, 10: 2890.00},
            60.0: {1: 2725.00, 2: 4413.00, 3: 4610.00, 4: 5245.00, 5: 6369.00, 6: 5557.00, 7: 5339.00, 8: 7673.00, 9: 6937.00, 10: 3330.00},
            70.0: {1: 3165.00, 2: 5183.00, 3: 5320.00, 4: 6135.00, 5: 7349.00, 6: 6487.00, 7: 6229.00, 8: 8613.00, 9: 8117.00, 10: 3770.00},
        }
        
        # Tarifs DHL pour l'import (en MAD)
        self.dhl_import_rates = {
            # Format: poids_kg: {zone: tarif}
            0.5: {1: 15.00, 2: 62.00, 3: 20.00, 4: 49.00, 5: 49.00, 6: 107.00, 7: 49.00, 8: 49.00, 9: 150.00},
            1.0: {1: 27.00, 2: 73.00, 3: 32.00, 4: 73.00, 5: 73.00, 6: 131.00, 7: 73.00, 8: 73.00, 9: 174.00},
            1.5: {1: 39.00, 2: 73.00, 3: 44.00, 4: 73.00, 5: 73.00, 6: 131.00, 7: 73.00, 8: 73.00, 9: 174.00},
            2.0: {1: 51.00, 2: 73.00, 3: 56.00, 4: 73.00, 5: 73.00, 6: 131.00, 7: 73.00, 8: 73.00, 9: 174.00},
            2.5: {1: 66.00, 2: 88.00, 3: 71.00, 4: 97.00, 5: 104.00, 6: 162.00, 7: 111.00, 8: 117.00, 9: 218.00},
            3.0: {1: 81.00, 2: 103.00, 3: 86.00, 4: 121.00, 5: 135.00, 6: 193.00, 7: 149.00, 8: 161.00, 9: 262.00},
            4.0: {1: 111.00, 2: 133.00, 3: 116.00, 4: 165.00, 5: 197.00, 6: 255.00, 7: 224.00, 8: 247.00, 9: 348.00},
            5.0: {1: 141.00, 2: 163.00, 3: 146.00, 4: 209.00, 5: 259.00, 6: 317.00, 7: 299.00, 8: 333.00, 9: 434.00},
            6.0: {1: 226.00, 2: 363.00, 3: 231.00, 4: 327.00, 5: 501.00, 6: 435.00, 7: 417.00, 8: 627.00, 9: 552.00},
            7.0: {1: 311.00, 2: 563.00, 3: 316.00, 4: 445.00, 5: 743.00, 6: 553.00, 7: 535.00, 8: 921.00, 9: 670.00},
            8.0: {1: 396.00, 2: 763.00, 3: 401.00, 4: 563.00, 5: 985.00, 6: 671.00, 7: 653.00, 8: 1215.00, 9: 788.00},
            9.0: {1: 481.00, 2: 963.00, 3: 486.00, 4: 681.00, 5: 1227.00, 6: 789.00, 7: 771.00, 8: 1509.00, 9: 906.00},
            10.0: {1: 566.00, 2: 1163.00, 3: 571.00, 4: 799.00, 5: 1469.00, 6: 907.00, 7: 889.00, 8: 1803.00, 9: 1024.00},
            11.0: {1: 598.00, 2: 1198.00, 3: 603.00, 4: 888.00, 5: 1567.00, 6: 972.00, 7: 978.00, 8: 1979.00, 9: 1124.00},
            12.0: {1: 630.00, 2: 1233.00, 3: 635.00, 4: 977.00, 5: 1665.00, 6: 1037.00, 7: 1067.00, 8: 2155.00, 9: 1224.00},
            13.0: {1: 662.00, 2: 1268.00, 3: 667.00, 4: 1066.00, 5: 1763.00, 6: 1102.00, 7: 1156.00, 8: 2331.00, 9: 1324.00},
            14.0: {1: 694.00, 2: 1303.00, 3: 699.00, 4: 1155.00, 5: 1861.00, 6: 1167.00, 7: 1245.00, 8: 2507.00, 9: 1424.00},
            15.0: {1: 726.00, 2: 1338.00, 3: 731.00, 4: 1244.00, 5: 1959.00, 6: 1232.00, 7: 1334.00, 8: 2683.00, 9: 1524.00},
            16.0: {1: 758.00, 2: 1373.00, 3: 763.00, 4: 1333.00, 5: 2057.00, 6: 1297.00, 7: 1423.00, 8: 2859.00, 9: 1624.00},
            17.0: {1: 790.00, 2: 1408.00, 3: 795.00, 4: 1422.00, 5: 2155.00, 6: 1362.00, 7: 1512.00, 8: 3035.00, 9: 1724.00},
            18.0: {1: 822.00, 2: 1443.00, 3: 827.00, 4: 1511.00, 5: 2253.00, 6: 1427.00, 7: 1601.00, 8: 3211.00, 9: 1824.00},
            19.0: {1: 854.00, 2: 1478.00, 3: 859.00, 4: 1600.00, 5: 2351.00, 6: 1492.00, 7: 1690.00, 8: 3387.00, 9: 1924.00},
            20.0: {1: 886.00, 2: 1513.00, 3: 891.00, 4: 1689.00, 5: 2449.00, 6: 1557.00, 7: 1779.00, 8: 3563.00, 9: 2024.00},
            21.0: {1: 918.00, 2: 1566.00, 3: 923.00, 4: 1778.00, 5: 2547.00, 6: 1622.00, 7: 1868.00, 8: 3692.00, 9: 2124.00},
            22.0: {1: 950.00, 2: 1619.00, 3: 955.00, 4: 1867.00, 5: 2645.00, 6: 1687.00, 7: 1957.00, 8: 3821.00, 9: 2224.00},
            23.0: {1: 982.00, 2: 1672.00, 3: 987.00, 4: 1956.00, 5: 2743.00, 6: 1752.00, 7: 2046.00, 8: 3950.00, 9: 2324.00},
            24.0: {1: 1014.00, 2: 1725.00, 3: 1019.00, 4: 2045.00, 5: 2841.00, 6: 1817.00, 7: 2135.00, 8: 4079.00, 9: 2424.00},
            25.0: {1: 1046.00, 2: 1778.00, 3: 1051.00, 4: 2134.00, 5: 2939.00, 6: 1882.00, 7: 2224.00, 8: 4208.00, 9: 2524.00},
            26.0: {1: 1078.00, 2: 1831.00, 3: 1083.00, 4: 2223.00, 5: 3037.00, 6: 1947.00, 7: 2313.00, 8: 4337.00, 9: 2624.00},
            27.0: {1: 1110.00, 2: 1884.00, 3: 1115.00, 4: 2312.00, 5: 3135.00, 6: 2012.00, 7: 2402.00, 8: 4466.00, 9: 2724.00},
            28.0: {1: 1142.00, 2: 1937.00, 3: 1147.00, 4: 2401.00, 5: 3233.00, 6: 2077.00, 7: 2491.00, 8: 4595.00, 9: 2824.00},
            29.0: {1: 1174.00, 2: 1990.00, 3: 1179.00, 4: 2490.00, 5: 3331.00, 6: 2142.00, 7: 2580.00, 8: 4724.00, 9: 2924.00},
            30.0: {1: 1206.00, 2: 2043.00, 3: 1211.00, 4: 2579.00, 5: 3429.00, 6: 2207.00, 7: 2669.00, 8: 4853.00, 9: 3024.00},
            40.0: {1: 1526.00, 2: 2573.00, 3: 1531.00, 4: 3469.00, 5: 4409.00, 6: 2857.00, 7: 3559.00, 8: 5793.00, 9: 4024.00},
            50.0: {1: 1846.00, 2: 3103.00, 3: 1851.00, 4: 4359.00, 5: 5389.00, 6: 3507.00, 7: 4449.00, 8: 6733.00, 9: 5024.00},
            60.0: {1: 2166.00, 2: 3633.00, 3: 2171.00, 4: 5249.00, 5: 6369.00, 6: 4157.00, 7: 5339.00, 8: 7673.00, 9: 6024.00},
            70.0: {1: 2486.00, 2: 4163.00, 3: 2491.00, 4: 6139.00, 5: 7349.00, 6: 4807.00, 7: 6229.00, 8: 8613.00, 9: 7024.00},
        }
        
        # Tarifs supplémentaires par kg au-delà de 10.1 kg pour l'export
        self.export_additional_kg_rates = {
            # Format: (from_kg, to_kg): {zone: tarif_par_kg}
            (10.1, 20.0): {1: 35.00, 2: 35.00, 3: 65.00, 4: 89.00, 5: 98.00, 6: 93.00, 7: 89.00, 8: 176.00, 9: 118.00, 10: 47.00},
            (20.1, 30.0): {1: 47.00, 2: 53.00, 3: 77.00, 4: 89.00, 5: 98.00, 6: 93.00, 7: 89.00, 8: 129.00, 9: 118.00, 10: 62.00},
            (30.1, 99.99): {1: 44.00, 2: 77.00, 3: 71.00, 4: 89.00, 5: 98.00, 6: 93.00, 7: 89.00, 8: 94.00, 9: 118.00, 10: 44.00},
        }
        
        # Tarifs supplémentaires par kg au-delà de 10.1 kg pour l'import
        self.import_additional_kg_rates = {
            # Format: (from_kg, to_kg): {zone: tarif_par_kg}
            (10.1, 20.0): {1: 32.00, 2: 35.00, 3: 32.00, 4: 89.00, 5: 98.00, 6: 65.00, 7: 89.00, 8: 176.00, 9: 100.00},
            (20.1, 30.0): {1: 32.00, 2: 53.00, 3: 32.00, 4: 89.00, 5: 98.00, 6: 65.00, 7: 89.00, 8: 129.00, 9: 100.00},
            (30.1, 99.99): {1: 32.00, 2: 53.00, 3: 32.00, 4: 89.00, 5: 98.00, 6: 65.00, 7: 89.00, 8: 94.00, 9: 100.00},
        }
        
        # Mapping des pays vers les zones DHL (export)
        self.export_zones = {
            # Zone 1
            "Algérie": 1, "Espagne": 1, "France": 1, "Mauritanie": 1, "Tunisie": 1,
            # Zone 2
            "Afghanistan": 2, "Arabie Saoudite": 2, "Bahrein": 2, "Egypte": 2, "Emirats Arabes Unis": 2,
            "Irak": 2, "Iran": 2, "Jordanie": 2, "Koweit": 2, "Liban": 2, "Libye": 2, "Oman": 2, "Qatar": 2,
            "Syrie": 2, "Yemen": 2,
            # Zone 3
            "Allemagne": 10,  # Attention: Zone 10 pour l'export
            "Andorre": 3, "Autriche": 3, "Belgique": 3, "Canaries": 3, "Chypre": 3, "Crète": 3,
            "Danemark": 3, "Falklands": 3, "Finlande": 3, "Grande Bretagne": 3, "Groenland": 3,
            "Guernesey": 3, "Irlande": 3, "Islande": 3, "Italie": 10,  # Attention: Zone 10 pour l'export
            "Jersey": 3, "Liechtenstein": 3, "Luxembourg": 3, "Madère": 3, "Malte": 3, "Monaco": 3,
            "Norvège": 3, "Pays-Bas": 3, "Suède": 3, "Suisse": 3, "Turquie": 3, "Vatican": 3,
            # Zone 4
            "Albanie": 4, "Bielorussie": 4, "Bosnie Herzegovine": 4, "Bulgarie": 4, "Chine": 4,
            "Corée du Sud": 4, "Croatie": 4, "Estonie": 4, "Feroé": 4, "Gibraltar": 4, "Hong Kong": 4,
            "Hongrie": 4, "Israël": 4, "Japon": 4, "Kosovo": 4, "Lettonie": 4, "Lithuanie": 4,
            "Macédoine": 4, "Moldavie": 4, "Monténégro": 4, "Pologne": 4, "Roumanie": 4, "Russie": 4,
            "Serbie": 4, "Slovaquie": 4, "Slovénie": 4, "Taïwan": 4, "Tchèque": 4, "Ukraine": 4,
            # Zone 5
            "Afrique du Sud": 5, "Australie": 8,  # Attention: Zone 8 pour l'export
            "Bangladesh": 5, "Bhoutan": 5, "Brunei": 5, "Cambodge": 5, "Canada": 5, "Corée du Nord": 9,  # Attention: Zone 9 pour l'export
            "Guam": 5, "Inde": 5, "Indonésie": 5, "Laos": 5, "Malaisie": 5, "Maldives": 5, "Marshall": 5,
            "Mexique": 5, "Micronésie": 5, "Mongolie": 9,  # Attention: Zone 9 pour l'export
            "N. Marianne": 5, "Népal": 5, "Pakistan": 5, "Palaos": 5, "Philippines": 5, "Porto Rico": 5,
            "Singapour": 5, "Thaïlande": 5, "Timor Oriental": 5, "Vietnam": 5, "Vierges US": 5,
            # Zone 6
            "Etats-Unis": 6,
            # Zone 7 (nombreux pays africains et autres)
            "Angola": 7, "Anguilla": 7, "Antigua": 7, "Aruba": 7, "Azerbaijan": 7, "Bahamas": 7,
            "Barbades": 7, "Belize": 7, "Bermudes": 7, "Bolivie": 7, "Bonaire": 7, "Botswana": 7,
            "Brésil": 7, "Burkina Faso": 7, "Burundi": 7, "Bénin": 7, "Cameroun": 7, "Cap Vert": 7,
            "Cayman": 7, "Chili": 7, "Colombie": 7, "Comores": 7, "Congo": 7, "Costa Rica": 7,
            "Cuba": 7, "Curaçao": 7, "Côte d'Ivoire": 7, "Djibouti": 7, "Dominicaine": 7, "Dominique": 7,
            "El Salvador": 7, "Equateur": 7, "Erythrée": 7, "Ethiopie": 7, "Gabon": 7, "Gambie": 7,
            "Ghana": 7, "Grenade": 7, "Guadeloupe": 7, "Guatemala": 7, "Guinée Bissau": 7,
            "Guinée Equatoriale": 7, "Guinée République": 7, "Guyana": 7, "Guyane Française": 7,
            "Géorgie": 7, "Haïti": 7, "Honduras": 7, "Jamaïque": 7, "Kazakhstan": 7, "Kenya": 7,
            "Kirghizistan": 7, "Lesotho": 7, "Libéria": 7, "Madagascar": 7, "Malawi": 7, "Mali": 9,  # Attention: Zone 9 pour l'export
            "Martinique": 7, "Maurice": 7, "Mayotte": 7, "Montserrat": 7, "Mozambique": 7, "Namibie": 7,
            "Nicaragua": 7, "Niger": 9,  # Attention: Zone 9 pour l'export
            "Nigeria": 7, "Ouganda": 7, "Ouzbekistan": 7, "Panama": 7, "Paraguay": 7, "Pérou": 7,
            "République Dominicaine": 7, "Rwanda": 7, "Réunion": 7, "Saint-Martin": 7, "Sainte Hélène": 7,
            "Sainte Lucie": 7, "Saint-Barthélemy": 7, "Saint-Kitts": 7, "Saint-Vincent": 7,
            "Sao Tomé et Principe": 7, "Seychelles": 7, "Sierra Leone": 7, "Somaliland": 7,
            "St Eustache": 7, "Sud Soudan": 7, "Surinam": 7, "Swaziland": 7, "Sénégal": 7,
            "Tadjikistan": 7, "Tanzanie": 7, "Tchad": 7, "Togo": 7, "Trinité et Tobago": 7,
            "Turkmenistan": 7, "Turks et Caicos": 7, "Uruguay": 7, "Vierges UK": 7, "Zambie": 7,
            "Zimbabwe": 9,  # Attention: Zone 9 pour l'export
            # Zone 8
            "Cook": 8, "Fidji": 8, "Kiribati": 8, "Nauru": 8, "Niue": 8, "Nouvelle Calédonie": 8,
            "Nouvelle Zélande": 8, "Papouasie Nouvelle Guinée": 8, "Polynésie": 8, "Salomon": 8,
            "Samoa": 8, "Samoa Américaines": 5,  # Attention: Zone 5 pour l'export
            "Tonga": 8, "Tuvalu": 8, "Vanuatu": 8,
            # Zone 9
            "Birmanie": 9, "Centrafrique": 9, "Congo RD": 9, "Somalie": 9, "Soudan": 9, "Vénézuela": 9,
            # Zone 10 (pour l'export uniquement)
            "Allemagne": 10, "Italie": 10,
            # Ajout des pays en anglais pour faciliter la recherche
            "UK": 3, "United Kingdom": 3, "England": 3, "Great Britain": 3,
            "USA": 6, "United States": 6, "United States of America": 6,
            "UAE": 2, "United Arab Emirates": 2,
            "Saudi Arabia": 2,
            "Morocco": 1, "Maroc": 1,
            "Turkey": 3, "Türkiye": 3,
            "Istanbul": 3
        }
        
        # Mapping des pays vers les zones DHL (import)
        self.import_zones = {
            # Zone 1
            "Algérie": 1, "Espagne": 1, "France": 1, "Mauritanie": 1, "Tunisie": 1,
            "Allemagne": 1, "Belgique": 1, "Italie": 1, "Liechtenstein": 1, "Luxembourg": 1,
            "Monaco": 1, "Pays-Bas": 1, "Suisse": 1, "Vatican": 1,
            # Zone 2
            "Afghanistan": 2, "Arabie Saoudite": 2, "Bahrein": 2, "Egypte": 2, "Emirats Arabes Unis": 2,
            "Irak": 2, "Iran": 2, "Jordanie": 2, "Koweit": 2, "Liban": 2, "Libye": 2, "Oman": 2, "Qatar": 2,
            "Syrie": 2, "Yemen": 2,
            # Zone 3
            "Andorre": 3, "Autriche": 3, "Canaries": 3, "Chypre": 3, "Crète": 3,
            "Danemark": 3, "Falklands": 3, "Finlande": 3, "Grande Bretagne": 3, "Groenland": 3,
            "Guernesey": 3, "Irlande": 3, "Islande": 3, "Jersey": 3, "Madère": 3, "Malte": 3,
            "Norvège": 3, "Suède": 3, "Turquie": 3,
            # Zone 4
            "Albanie": 4, "Bielorussie": 4, "Bosnie Herzegovine": 4, "Bulgarie": 4, "Chine": 4,
            "Corée du Sud": 4, "Croatie": 4, "Estonie": 4, "Feroé": 4, "Gibraltar": 4, "Hong Kong": 4,
            "Hongrie": 4, "Israël": 4, "Japon": 4, "Kosovo": 4, "Lettonie": 4, "Lithuanie": 4,
            "Macédoine": 4, "Moldavie": 4, "Monténégro": 4, "Pologne": 4, "Roumanie": 4, "Russie": 4,
            "Serbie": 4, "Slovaquie": 4, "Slovénie": 4, "Taïwan": 4, "Tchèque": 4, "Ukraine": 4,
            # Zone 5
            "Afrique du Sud": 5, "Bangladesh": 5, "Bhoutan": 5, "Brunei": 5, "Cambodge": 5, "Canada": 5,
            "Guam": 5, "Inde": 5, "Indonésie": 5, "Laos": 5, "Malaisie": 5, "Maldives": 5, "Marshall": 5,
            "Mexique": 5, "Micronésie": 5, "N. Marianne": 5, "Népal": 5, "Pakistan": 5, "Palaos": 5,
            "Philippines": 5, "Porto Rico": 5, "Singapour": 5, "Thaïlande": 5, "Timor Oriental": 5,
            "Vietnam": 5, "Vierges US": 5, "Samoa Américaines": 5,
            # Zone 6
            "Etats-Unis": 6,
            # Zone 7
            "Angola": 7, "Anguilla": 7, "Antigua": 7, "Aruba": 7, "Azerbaijan": 7, "Bahamas": 7,
            "Barbades": 7, "Belize": 7, "Bermudes": 7, "Bolivie": 7, "Bonaire": 7, "Botswana": 7,
            "Brésil": 7, "Burkina Faso": 7, "Burundi": 7, "Bénin": 7, "Cameroun": 7, "Cap Vert": 7,
            "Cayman": 7, "Chili": 7, "Colombie": 7, "Comores": 7, "Congo": 7, "Costa Rica": 7,
            "Cuba": 7, "Curaçao": 7, "Côte d'Ivoire": 7, "Djibouti": 7, "Dominicaine": 7, "Dominique": 7,
            "El Salvador": 7, "Equateur": 7, "Erythrée": 7, "Ethiopie": 7, "Gabon":   7, "Dominique": 7,
            "El Salvador": 7, "Equateur": 7, "Erythrée": 7, "Ethiopie": 7, "Gabon": 7, "Gambie": 7,
            "Ghana": 7, "Grenade": 7, "Guadeloupe": 7, "Guatemala": 7, "Guinée Bissau": 7,
            "Guinée Equatoriale": 7, "Guinée République": 7, "Guyana": 7, "Guyane Française": 7,
            "Géorgie": 7, "Haïti": 7, "Honduras": 7, "Jamaïque": 7, "Kazakhstan": 7, "Kenya": 7,
            "Kirghizistan": 7, "Lesotho": 7, "Libéria": 7, "Madagascar": 7, "Malawi": 7,
            "Martinique": 7, "Maurice": 7, "Mayotte": 7, "Montserrat": 7, "Mozambique": 7, "Namibie": 7,
            "Nicaragua": 7, "Nigeria": 7, "Ouganda": 7, "Ouzbekistan": 7, "Panama": 7, "Paraguay": 7, "Pérou": 7,
            "République Dominicaine": 7, "Rwanda": 7, "Réunion": 7, "Saint-Martin": 7, "Sainte Hélène": 7,
            "Sainte Lucie": 7, "Saint-Barthélemy": 7, "Saint-Kitts": 7, "Saint-Vincent": 7,
            "Sao Tomé et Principe": 7, "Seychelles": 7, "Sierra Leone": 7, "Somaliland": 7,
            "St Eustache": 7, "Sud Soudan": 7, "Surinam": 7, "Swaziland": 7, "Sénégal": 7,
            "Tadjikistan": 7, "Tanzanie": 7, "Tchad": 7, "Togo": 7, "Trinité et Tobago": 7,
            "Turkmenistan": 7, "Turks et Caicos": 7, "Uruguay": 7, "Vierges UK": 7, "Zambie": 7,
            # Zone 8
            "Australie": 8, "Cook": 8, "Fidji": 8, "Kiribati": 8, "Nauru": 8, "Niue": 8, "Nouvelle Calédonie": 8,
            "Nouvelle Zélande": 8, "Papouasie Nouvelle Guinée": 8, "Polynésie": 8, "Salomon": 8,
            "Samoa": 8, "Tonga": 8, "Tuvalu": 8, "Vanuatu": 8,
            # Zone 9
            "Birmanie": 9, "Centrafrique": 9, "Congo RD": 9, "Corée du Nord": 9, "Mali": 9, "Mongolie": 9,
            "Niger": 9, "Somalie": 9, "Soudan": 9, "Vénézuela": 9, "Zimbabwe": 9,
            # Ajout des pays en anglais pour faciliter la recherche
            "UK": 3, "United Kingdom": 3, "England": 3, "Great Britain": 3,
            "USA": 6, "United States": 6, "United States of America": 6,
            "UAE": 2, "United Arab Emirates": 2,
            "Saudi Arabia": 2,
            "Morocco": 1, "Maroc": 1,
            "Turkey": 3, "Türkiye": 3,
            "Istanbul": 3
        }
        
        # Suppléments pour les services premium
        self.premium_services = {
            "Premium 9:00": 374.50,
            "Premium 10:30": 107.00,
            "Premium 12:00": 53.50
        }
        
        # Suppléments pour les services spéciaux
        self.special_services = {
            "GoGreen Plus - Carbon Reduced": 5.89  # par kg
        }
    
    def get_zone_for_country(self, country_name: str, direction: str = "export") -> int:
        """
        Retourne la zone DHL correspondant au pays spécifié.
        
        Args:
            country_name: Nom du pays
            direction: Direction du transport ('export' ou 'import')
            
        Returns:
            Zone DHL (1-10 pour export, 1-9 pour import)
        """
        # Choisir le mapping de zones en fonction de la direction
        zones_mapping = self.export_zones if direction == "export" else self.import_zones
        
        # Recherche insensible à la casse
        for pays, zone in zones_mapping.items():
            if country_name.lower() in pays.lower() or pays.lower() in country_name.lower():
                return zone
        
        # Par défaut, retourner la zone 7 (la plus courante pour les pays non listés)
        return 7
    
    def calculate_shipping_cost(
        self, 
        weight_kg: float, 
        country: str, 
        direction: str = "export",
        premium_service: Optional[str] = None
    ) -> float:
        """
        Calcule les frais de transport DHL en fonction du poids, du pays et de la direction.
        
        Args:
            weight_kg: Poids en kg
            country: Pays de destination (pour export) ou d'origine (pour import)
            direction: Direction du transport ('export' ou 'import')
            premium_service: Service premium optionnel ('Premium 9:00', 'Premium 10:30', 'Premium 12:00')
            
        Returns:
            Coût du transport en MAD
        """
        # Obtenir la zone DHL
        zone = self.get_zone_for_country(country, direction)
        
        # Choisir les tarifs en fonction de la direction
        rates = self.dhl_export_rates if direction == "export" else self.dhl_import_rates
        additional_kg_rates = self.export_additional_kg_rates if direction == "export" else self.import_additional_kg_rates
        
        # Vérifier que la zone est valide
        max_zone = 10 if direction == "export" else 9
        if zone not in range(1, max_zone + 1):
            raise ValueError(f"Zone DHL invalide: {zone}")
        
        # Trouver le tarif de base pour le poids exact ou le poids supérieur le plus proche
        weight_keys = sorted(rates.keys())
        
        # Si le poids est inférieur ou égal à 70 kg, utiliser les tarifs de base
        if weight_kg <= 70.0:
            # Trouver le poids de référence le plus proche (supérieur ou égal)
            base_weight = next((w for w in weight_keys if w >= weight_kg), 70.0)
            shipping_cost = rates[base_weight][zone]
        
        # Pour les poids supérieurs à 70 kg, calculer avec le tarif de base + tarif par kg supplémentaire
        else:
            # Trouver la tranche de poids applicable
            for (from_kg, to_kg), rates_by_zone in additional_kg_rates.items():
                if from_kg <= weight_kg <= to_kg:
                    # Calculer le nombre de kg au-delà de 10 kg
                    additional_kg = weight_kg - 10.0
                    # Retourner le tarif de base pour 10 kg + tarif par kg supplémentaire
                    shipping_cost = rates[10.0][zone] + (additional_kg * rates_by_zone[zone])
                    break
            else:
                # Si le poids est supérieur à la dernière tranche, utiliser le tarif de la dernière tranche
                additional_kg = weight_kg - 10.0
                shipping_cost = rates[10.0][zone] + (additional_kg * additional_kg_rates[(30.1, 99.99)][zone])
        
        # Ajouter le supplément pour le service premium si demandé
        if premium_service and premium_service in self.premium_services:
            shipping_cost += self.premium_services[premium_service]
        
        # Arrondir à 2 décimales
        return round(shipping_cost, 2)
    
    def calculate_multi_leg_shipping(
        self,
        legs: List[Dict[str, Any]],
        weight_kg: float,
        dimensions: Optional[Tuple[float, float, float]] = None,
        premium_service: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calcule les frais de transport pour un envoi multi-étapes.
        
        Args:
            legs: Liste des étapes du transport
                [
                    {
                        "origin_country": "UK",
                        "destination_country": "Maroc",
                        "direction": "import"
                    },
                    {
                        "origin_country": "Maroc",
                        "destination_country": "Turquie",
                        "direction": "export"
                    }
                ]
            weight_kg: Poids total en kg
            dimensions: Dimensions (longueur, largeur, hauteur) en cm
            premium_service: Service premium optionnel
            
        Returns:
            Dictionnaire contenant les frais totaux et par étape
        """
        # Calculer le poids effectif si les dimensions sont fournies
        effective_weight = weight_kg
        if dimensions:
            length, width, height = dimensions
            effective_weight = self.get_effective_weight(weight_kg, length, width, height)
        
        total_cost = 0
        leg_costs = []
        
        # Calculer les frais pour chaque étape
        for i, leg in enumerate(legs):
            origin_country = leg.get("origin_country", "")
            destination_country = leg.get("destination_country", "")
            direction = leg.get("direction", "export")
            
            # Pays pour le calcul (destination pour export, origine pour import)
            country = destination_country if direction == "export" else origin_country
            
            try:
                # Calculer les frais de transport pour cette étape
                shipping_cost = self.calculate_shipping_cost(
                    weight_kg=effective_weight,
                    country=country,
                    direction=direction,
                    premium_service=premium_service if i == len(legs) - 1 else None  # Appliquer le service premium uniquement à la dernière étape
                )
                
                # Obtenir la zone pour cette étape
                zone = self.get_zone_for_country(country, direction)
                
                leg_costs.append({
                    "leg": i + 1,
                    "from": origin_country,
                    "to": destination_country,
                    "direction": direction,
                    "zone": zone,
                    "cost": shipping_cost,
                    "currency": "MAD"
                })
                
                total_cost += shipping_cost
            
            except Exception as e:
                leg_costs.append({
                    "leg": i + 1,
                    "from": origin_country,
                    "to": destination_country,
                    "direction": direction,
                    "cost": 0,
                    "currency": "MAD",
                    "error": str(e)
                })
        
        return {
            "total_cost": round(total_cost, 2),
            "currency": "MAD",
            "effective_weight": effective_weight,
            "legs": leg_costs
        }
    
    def calculate_volumetric_weight(self, length_cm: float, width_cm: float, height_cm: float) -> float:
        """
        Calcule le poids volumétrique selon la formule DHL.
        
        Args:
            length_cm: Longueur en cm
            width_cm: Largeur en cm
            height_cm: Hauteur en cm
            
        Returns:
            Poids volumétrique en kg
        """
        # Formule DHL: (L x l x H) / 5000
        return (length_cm * width_cm * height_cm) / 5000
    
    def get_effective_weight(self, actual_weight_kg: float, length_cm: float, width_cm: float, height_cm: float) -> float:
        """
        Détermine le poids effectif (le plus élevé entre le poids réel et le poids volumétrique).
        
        Args:
            actual_weight_kg: Poids réel en kg
            length_cm: Longueur en cm
            width_cm: Largeur en cm
            height_cm: Hauteur en cm
            
        Returns:
            Poids effectif en kg
        """
        volumetric_weight = self.calculate_volumetric_weight(length_cm, width_cm, height_cm)
        return max(actual_weight_kg, volumetric_weight)
    
    def parse_dimensions(self, dimensions_str: str) -> Optional[Tuple[float, float, float]]:
        """
        Parse une chaîne de dimensions au format "LxlxH" en tuple (longueur, largeur, hauteur).
        
        Args:
            dimensions_str: Chaîne de dimensions au format "LxlxH" (ex: "30x20x15")
            
        Returns:
            Tuple (longueur, largeur, hauteur) ou None si le format est invalide
        """
        if not dimensions_str:
            return None
        
        try:
            # Supprimer les espaces et diviser par "x" ou "X"
            parts = dimensions_str.replace(" ", "").replace("X", "x").split("x")
            if len(parts) != 3:
                return None
            
            # Convertir en nombres flottants
            length, width, height = float(parts[0]), float(parts[1]), float(parts[2])
            return (length, width, height)
        
        except (ValueError, IndexError):
            return None
    
    def simulate_uk_morocco_istanbul_shipping(self, weight_kg: float, dimensions_str: Optional[str] = None) -> Dict[str, Any]:
        """
        Simule un scénario spécifique: UK -> Maroc -> Istanbul avec un poids donné.
        
        Args:
            weight_kg: Poids en kg
            dimensions_str: Dimensions au format "LxlxH" en cm
            
        Returns:
            Résultat de la simulation
        """
        # Calculer le poids effectif si les dimensions sont fournies
        dimensions = self.parse_dimensions(dimensions_str) if dimensions_str else None
        
        # Définir les étapes du transport
        legs = [
            {
                "origin_country": "UK",
                "destination_country": "Maroc",
                "direction": "import"
            },
            {
                "origin_country": "Maroc",
                "destination_country": "Turquie",
                "direction": "export"
            }
        ]
        
        # Calculer les frais de transport
        return self.calculate_multi_leg_shipping(legs, weight_kg, dimensions)
