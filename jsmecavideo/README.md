# gistphysis jsmecavideo

[Lien vers le projet](https://habib256.github.io/gistphysis/jsmecavideo/)

jsmecavideo est une application web de lecture vidéo basée sur la bibliothèque p5.js. Le code source comprend une classe VideoPlayer qui gère la lecture vidéo et les interactions utilisateur comme le démarrage, la pause, l'avancement et le retour en arrière. Cette classe est utilisée dans le fichier mecavideo.js pour créer une instance de lecteur vidéo et la dessiner sur le canvas.

##Comment utiliser l'application

L'application permet maintenant d'enregistrer des vidéos à partir de votre webcam en plus de sélectionner une vidéo à partir d'un menu déroulant. Vous pouvez contrôler la lecture de la vidéo à l'aide des boutons de contrôle. Vous pouvez également cliquer sur le curseur pour avancer ou reculer dans la vidéo.

##Support de la Webcam

Une nouvelle fonctionnalité a été ajoutée pour permettre l'enregistrement de vidéos à partir de votre webcam. Vous pouvez démarrer et arrêter l'enregistrement à l'aide du bouton "Enregistrer". Les vidéos enregistrées peuvent être lues, mises en pause, avancées et reculées comme les autres vidéos.

Liste des vidéos et explications:

MANY THANKS TO : https://webetab.ac-bordeaux.fr/Pedagogie/Physique/site/labo/tice/c_video_tice.htm
- 'videos/MasseRoule.mp4': Une vidéo montrant une masse qui roule.
- 'videos/PenduleSimpleAmorti_38cm1.mp4': Une vidéo d'un pendule simple amorti.
- 'videos/RessortVertical_Masse24g30.mp4': Une vidéo d'un ressort vertical avec une masse de 24g.
- 'videos/bille1-iv5.mp4': Une vidéo d'une bille en mouvement.
- 'videos/bille2-iv5.mp4': Une autre vidéo d'une bille en mouvement.
- 'videos/bille3-iv5.mp4': Une troisième vidéo d'une bille en mouvement.
- 'videos/billegrosse.mp4': Une vidéo d'une grosse bille.
- 'videos/billepetite.mp4': Une vidéo d'une petite bille.
- 'videos/BilleFer_Eau25C_2g055_7mm93.mp4': Une vidéo d'une bille de fer dans l'eau à 25°C.
- 'videos/moto-relatif.mp4': Une vidéo d'une moto pour étudier le mouvement relatif.
- 'videos/vague2cm5.mp4': Une vidéo d'une vague de 2,5 cm.
- 'videos/vague3.mp4': Une vidéo d'une vague de 3 cm.
- 'videos/vague3cm0.mp4': Une vidéo d'une vague de 3 cm.
- 'videos/Eclatement2MA.mp4': Une vidéo d'un éclatement.
- etc ......


Conversion de vidéos

Le script convert2mp4.py permet de convertir des fichiers vidéo au format .avi en .mp4. Les fichiers convertis sont placés dans le dossier videos/.

Ajoutez vos fichiers vidéo dans le code avec leur framerate respectif obtenu grace à la commande suivante
# ffprobe -v error -select_streams v -of default=noprint_wrappers=1:nokey=1 -show_entries stream=r_frame_rate vague3.mp4 

##Licence

Le projet est sous licence GNU General Public License v2.0, comme indiqué dans le fichier LICENSE. Cette licence permet la liberté de partager et de modifier le logiciel.