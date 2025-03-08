const Logo = ({
  width = 300,
  height = null,
  viewBoxHeight = 114, // Hauteur par défaut de la viewBox
  viewBoxWidth = 600, // Largeur par défaut de la viewBox
  className = "",
}) => {
  // Si une hauteur spécifique est fournie, l'utiliser,
  // sinon calculer la hauteur en fonction du rapport d'aspect de la viewBox
  const aspectRatio = viewBoxHeight / viewBoxWidth;
  const calculatedHeight = height || Math.round(width * aspectRatio);

  // Construire la viewBox personnalisée
  const viewBox = `0 0 ${viewBoxWidth} ${viewBoxHeight}`;

  return (
    <svg
      width={width}
      height={calculatedHeight}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M547.736 247.12C544.742 251.457 541.062 256.581 536.697 262.492C532.332 268.403 527.174 274.145 521.223 279.719C515.669 285.377 509.526 290.392 502.794 294.763C493.898 300.54 484.709 304.286 475.227 306C465.744 307.715 456.533 306.689 447.593 302.924C438.738 298.762 430.719 291.152 423.537 280.093L353.045 171.543L328.161 187.703L304.039 150.558L328.922 134.399L289.109 73.092L337.434 41.71L377.247 103.017L416.916 77.2554L441.038 114.4L401.369 140.161L461.323 232.482C465.779 238.817 470.626 242.334 475.866 243.034C481.105 243.733 486.249 242.443 491.298 239.165C496.347 235.886 500.729 231.844 504.444 227.038C508.16 222.233 511.07 218.292 513.174 215.217L547.736 247.12Z"
        fill="currentColor"
      />
      <path
        d="M688.892 315.455V316.307H685.5V315.455H688.892ZM686.489 313.886H687.494V320.125C687.494 320.409 687.536 320.622 687.618 320.764C687.703 320.903 687.811 320.997 687.942 321.045C688.075 321.091 688.216 321.114 688.364 321.114C688.474 321.114 688.565 321.108 688.636 321.097C688.707 321.082 688.764 321.071 688.807 321.062L689.011 321.966C688.943 321.991 688.848 322.017 688.726 322.043C688.604 322.071 688.449 322.085 688.261 322.085C687.977 322.085 687.699 322.024 687.426 321.902C687.156 321.78 686.932 321.594 686.753 321.344C686.577 321.094 686.489 320.778 686.489 320.398V313.886Z"
        fill="currentColor"
      />
      <path
        d="M1838.23 208.864H1890.5L1916.78 242.67L1942.63 272.784L1991.35 333.864H1933.97L1900.44 292.67L1883.26 268.239L1838.23 208.864ZM1995.76 164.545C1995.76 196.269 1989.74 223.257 1977.72 245.511C1965.78 267.765 1949.5 284.763 1928.85 296.506C1908.3 308.153 1885.2 313.977 1859.53 313.977C1833.68 313.977 1810.48 308.106 1789.93 296.364C1769.38 284.621 1753.14 267.623 1741.21 245.369C1729.28 223.115 1723.31 196.174 1723.31 164.545C1723.31 132.822 1729.28 105.833 1741.21 83.5794C1753.14 61.3256 1769.38 44.3749 1789.93 32.7272C1810.48 20.9847 1833.68 15.1135 1859.53 15.1135C1885.2 15.1135 1908.3 20.9847 1928.85 32.7272C1949.5 44.3749 1965.78 61.3256 1977.72 83.5794C1989.74 105.833 1995.76 132.822 1995.76 164.545ZM1933.4 164.545C1933.4 143.996 1930.32 126.667 1924.16 112.557C1918.1 98.4469 1909.53 87.7461 1898.45 80.4544C1887.38 73.1628 1874.4 69.5169 1859.53 69.5169C1844.67 69.5169 1831.69 73.1628 1820.61 80.4544C1809.53 87.7461 1800.92 98.4469 1794.76 112.557C1788.7 126.667 1785.67 143.996 1785.67 164.545C1785.67 185.095 1788.7 202.424 1794.76 216.534C1800.92 230.644 1809.53 241.345 1820.61 248.636C1831.69 255.928 1844.67 259.574 1859.53 259.574C1874.4 259.574 1887.38 255.928 1898.45 248.636C1909.53 241.345 1918.1 230.644 1924.16 216.534C1930.32 202.424 1933.4 185.095 1933.4 164.545Z"
        fill="currentColor"
      />
      <path
        d="M1475.68 19.0908V310H1415.16V19.0908H1475.68Z"
        fill="currentColor"
      />
      <path
        d="M1245.35 314.119C1231.43 314.119 1219.02 311.705 1208.13 306.875C1197.24 301.951 1188.63 294.706 1182.28 285.142C1176.03 275.483 1172.91 263.456 1172.91 249.063C1172.91 236.941 1175.13 226.761 1179.58 218.523C1184.03 210.284 1190.09 203.655 1197.76 198.636C1205.43 193.617 1214.15 189.83 1223.9 187.273C1233.75 184.716 1244.07 182.917 1254.87 181.875C1267.56 180.549 1277.78 179.318 1285.55 178.182C1293.31 176.951 1298.95 175.152 1302.45 172.784C1305.96 170.417 1307.71 166.913 1307.71 162.273V161.42C1307.71 152.424 1304.87 145.464 1299.18 140.54C1293.6 135.616 1285.64 133.153 1275.32 133.153C1264.43 133.153 1255.77 135.568 1249.33 140.398C1242.89 145.133 1238.63 151.099 1236.54 158.295L1180.58 153.75C1183.42 140.492 1189 129.034 1197.34 119.375C1205.67 109.621 1216.42 102.14 1229.58 96.9318C1242.84 91.6288 1258.18 88.9773 1275.61 88.9773C1287.73 88.9773 1299.33 90.3977 1310.41 93.2386C1321.58 96.0796 1331.48 100.483 1340.09 106.449C1348.81 112.415 1355.67 120.085 1360.69 129.46C1365.71 138.741 1368.22 149.867 1368.22 162.841V310H1310.83V279.744H1309.13C1305.62 286.563 1300.94 292.576 1295.07 297.784C1289.19 302.898 1282.14 306.922 1273.9 309.858C1265.66 312.699 1256.14 314.119 1245.35 314.119ZM1262.68 272.358C1271.58 272.358 1279.44 270.606 1286.26 267.102C1293.08 263.504 1298.43 258.674 1302.31 252.614C1306.19 246.553 1308.13 239.687 1308.13 232.017V208.864C1306.24 210.095 1303.64 211.231 1300.32 212.273C1297.1 213.22 1293.46 214.119 1289.38 214.972C1285.31 215.729 1281.24 216.439 1277.17 217.102C1273.1 217.67 1269.4 218.191 1266.09 218.665C1258.99 219.706 1252.78 221.364 1247.48 223.636C1242.18 225.909 1238.06 228.987 1235.12 232.869C1232.19 236.657 1230.72 241.392 1230.72 247.074C1230.72 255.313 1233.7 261.61 1239.67 265.966C1245.73 270.227 1253.4 272.358 1262.68 272.358Z"
        fill="currentColor"
      />
      <path
        d="M1158.03 91.8181L1081.75 310H1013.57L937.289 91.8181H1001.21L1046.52 247.926H1048.79L1093.97 91.8181H1158.03Z"
        fill="currentColor"
      />
      <path
        d="M784.305 310V91.8181H842.969V129.886H845.242C849.219 116.345 855.896 106.117 865.271 99.2045C874.646 92.1969 885.441 88.6931 897.657 88.6931C900.687 88.6931 903.954 88.8825 907.458 89.2613C910.962 89.6401 914.04 90.1609 916.691 90.8238V144.517C913.85 143.665 909.92 142.907 904.901 142.244C899.882 141.581 895.29 141.25 891.123 141.25C882.221 141.25 874.267 143.191 867.259 147.074C860.346 150.862 854.854 156.165 850.782 162.983C846.805 169.801 844.816 177.661 844.816 186.562V310H784.305Z"
        fill="currentColor"
      />
      <path
        d="M644.676 314.261C622.233 314.261 602.915 309.716 586.722 300.625C570.623 291.439 558.218 278.466 549.506 261.705C540.794 244.848 536.438 224.915 536.438 201.903C536.438 179.46 540.794 159.763 549.506 142.813C558.218 125.862 570.481 112.652 586.295 103.182C602.205 93.7121 620.86 88.9773 642.261 88.9773C656.655 88.9773 670.055 91.2974 682.46 95.9375C694.96 100.483 705.85 107.348 715.131 116.534C724.506 125.72 731.797 137.273 737.006 151.193C742.214 165.019 744.818 181.212 744.818 199.773V216.392H560.585V178.892H687.858C687.858 170.18 685.964 162.462 682.176 155.739C678.388 149.015 673.133 143.759 666.409 139.972C659.78 136.089 652.063 134.148 643.256 134.148C634.07 134.148 625.926 136.278 618.824 140.54C611.816 144.706 606.324 150.341 602.347 157.443C598.369 164.451 596.333 172.263 596.239 180.881V216.534C596.239 227.33 598.227 236.657 602.205 244.517C606.277 252.377 612.006 258.438 619.392 262.699C626.778 266.96 635.538 269.091 645.67 269.091C652.394 269.091 658.549 268.144 664.136 266.25C669.724 264.356 674.506 261.515 678.483 257.727C682.46 253.939 685.491 249.299 687.574 243.807L743.54 247.5C740.699 260.947 734.875 272.689 726.068 282.727C717.356 292.67 706.087 300.436 692.261 306.023C678.53 311.515 662.669 314.261 644.676 314.261Z"
        fill="currentColor"
      />
      <path
        d="M171.769 183.864V310H111.258V91.8182H168.928V130.313H171.485C176.315 117.623 184.411 107.585 195.775 100.199C207.138 92.7178 220.917 88.9773 237.11 88.9773C252.262 88.9773 265.472 92.2917 276.741 98.9205C288.01 105.549 296.769 115.019 303.019 127.33C309.269 139.545 312.394 154.129 312.394 171.08V310H251.883V181.875C251.978 168.523 248.568 158.106 241.656 150.625C234.743 143.049 225.226 139.261 213.104 139.261C204.96 139.261 197.763 141.013 191.513 144.517C185.358 148.021 180.529 153.134 177.025 159.858C173.616 166.487 171.864 174.489 171.769 183.864Z"
        fill="currentColor"
      />
      <path
        d="M2.27273 310V91.8183H62.7841V310H2.27273ZM32.6705 63.6933C23.6742 63.6933 15.9564 60.7103 9.51705 54.7444C3.17235 48.6838 0 41.4395 0 33.0115C0 24.6781 3.17235 17.5285 9.51705 11.5626C15.9564 5.50199 23.6742 2.47168 32.6705 2.47168C41.6667 2.47168 49.3371 5.50199 55.6818 11.5626C62.1212 17.5285 65.3409 24.6781 65.3409 33.0115C65.3409 41.4395 62.1212 48.6838 55.6818 54.7444C49.3371 60.7103 41.6667 63.6933 32.6705 63.6933Z"
        fill="currentColor"
      />
      <rect x="1723" y="143" width="326" height="56" fill="white" />
      <path
        d="M1639.32 310V135.455H1687.73V310H1639.32ZM1663.64 112.955C1656.44 112.955 1650.27 110.568 1645.11 105.795C1640.04 100.947 1637.5 95.1515 1637.5 88.4091C1637.5 81.7424 1640.04 76.0227 1645.11 71.25C1650.27 66.4015 1656.44 63.9773 1663.64 63.9773C1670.83 63.9773 1676.97 66.4015 1682.05 71.25C1687.2 76.0227 1689.77 81.7424 1689.77 88.4091C1689.77 95.1515 1687.2 100.947 1682.05 105.795C1676.97 110.568 1670.83 112.955 1663.64 112.955Z"
        fill="currentColor"
      />
    </svg>
  );
};

export default Logo;
